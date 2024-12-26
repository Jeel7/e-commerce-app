import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import { connectToDB } from './database/db.js'
import authRoutes from './routes/auth.route.js'
import productRoutes from './routes/product.route.js'
import cartRoutes from './routes/cart.route.js'
import couponRoutes from './routes/coupon.route.js'
import paymentRoutes from './routes/payment.route.js'
import analyticsRoute from './routes/analytics.route.js'

const app = express()

app.use(express.json({limit: "10mb"})) //allowes admin to upload max 10mb image
app.use(cookieParser())

app.use("/api/auth", authRoutes)

app.use("/api/products", productRoutes)

app.use("/api/cart", cartRoutes)

app.use("/api/coupons", couponRoutes)

app.use("/api/payments", paymentRoutes)

app.use("/api/analytics", analyticsRoute)

//deployment part

const __dirname = path.resolve()

if(process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '/frontend/dist')))

    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"))
    })
}

app.listen( process.env.PORT, () => {
    connectToDB()
    console.log("server is running")
})

