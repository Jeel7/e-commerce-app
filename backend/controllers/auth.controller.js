import User from '../models/User.js'
import bcrypt from 'bcryptjs'
import { generateToken } from '../lib/generateToken.js'
import { client } from '../lib/redis.js'
import { setCookie } from '../lib/setCookie.js'
import jwt from 'jsonwebtoken'

//=> Store refresh tokens to the redis

const storeRefreshToken = async (userId, refreshToken) => {
    await client.set(`refresh_token: ${userId}`, refreshToken, "EX", 7*24*60*60)  //valid for 7 days
}

//=> Signup

export const signup = async (req, res) => {

    const { name, email, password } = req.body

    try {

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            })
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be atleast 8 characters long!"
            })
        }

        const checkExistingUser = await User.findOne({ email })

        if (checkExistingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exist, try to do signup!"
            })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const user = new User({
            email,
            password: hashedPassword,
            name
        })
        await user.save()

        // Authenticate

        const { accessToken, refreshToken } = generateToken(user._id) //access-toekn: 15 mins, refresh-token:7 days

        await storeRefreshToken(user._id, refreshToken)

        setCookie(res, accessToken, refreshToken)

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                ...user._doc,
                password: undefined
            }
        })

    } catch (e) {
        console.log(e)
        res.status(500).json({
            success: false,
            message: "Something went wrong, try again later!"
        })
    }
}

//=> Login

export const login = async (req, res) => {

    const {email, password} = req.body

    try {
        const user = await User.findOne({ email })

        if(!user){
            return res.status(400).json({
                status: false,
                message: "User doesn't exists, Please do signup first!"
            })
        }

        const isPasswordMatching = await bcrypt.compare(password, user.password)

        if(!isPasswordMatching){
            return res.status(400).json({
                success: false,
                message: "Invalid credentials!"
            })
        }

        const {accessToken, refreshToken} = generateToken(user._id)

        await storeRefreshToken(user._id, refreshToken)

        setCookie(res, accessToken, refreshToken)

        await user.save()

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            user: {
                ...user._doc,
                password: undefined
            }
        })

    } catch (e) {
        console.log(e)
        res.status(500).json({
            success: false,
            message: "Something went wrong, try again later!"
        })
    }
}

//=> Logout

export const logout = async (req, res) => {

    //delete 'refreshToken' from redis & clear it from cookies

    try{
        const refreshToken = req.cookies.refreshToken

        if(refreshToken){
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
            await client.del(`refresh_token: ${decoded.userId}`)
        }

        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        })
        
    }catch(e){
        console.log(e)
        res.status(500).json({
            status: false,
            message: "Error while logging out!"
        })
    }
}

//=> This will refresh 'access_token', bcz it will expires in every 15 min, and create a new accessToken with passing 'refreshToken' to it

export const refreshToken = async(req, res) => {
    try{
        const refreshToken = req.cookies.refreshToken

        if(!refreshToken){
            return res.status(401).json({
                success: false,
                message: "No refresh token provided"
            })
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
        const storedToken = await client.get(`refresh_token: ${decoded.userId}`)

        if(storedToken !== refreshToken){
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token"
            })
        }

        //else part: generate new access token
        const accessToken = jwt.sign({userId: decoded.userId}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "15m"})

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000   //15 mins
        })

        res.json({
            success: true,
            message: "Token refreshed successfully"
        })

    }catch(e){
        console.log(e)
        res.status(500).json({
            success: false,
            message: "Something went wrong!"
        })
    }
}

//=> User profile

export const profile = async(req, res) => {

    try{
        res.json(req.user)

    }catch(e){
        console.log(e)
        res.status(500).json({
            success: false,
            message: "Something went wrong!"
        })
    }
}

