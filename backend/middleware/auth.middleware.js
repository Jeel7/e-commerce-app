import jwt from 'jsonwebtoken'
import User from '../models/User.js'

//=> Check if user is logged in or not (means authenticated or not)
export const protectRoute = async(req, res, next) => {
    try{
        const accessToken = req.cookies.accessToken

        if(!accessToken){
            return res.status(401).json({
                status: false,
                message: "Unauthorized - no access token provided"
            })
        }

        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decoded.userId).select("-password")

        if(!user){
            return res.status(401).json({
                message: "User not found!"
            })
        }

        req.user = user   //else part, if user found

        next()

    }catch(e){
        console.log(e)
        res.status(500).json({
            success: false,
            message: "Something went wrong, try again later!"
        })
    }
}

//=> Only 'admin' can access
export const adminRoute = async(req, res, next) => {
    if(req.user && req.user.role == 'admin'){
        next()
    }else{
        return res.status(403).json({
            success: false,
            message: "Access denied - Admin only!"
        })
    }
}