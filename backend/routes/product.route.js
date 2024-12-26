import express from 'express'
import { getAllProducts, getFeaturedProducts, createProducts, deleteProducts, recommendedProducts, getProductFeatures, getProductsByCategory } from '../controllers/product.controller.js'
import { adminRoute, protectRoute } from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/', protectRoute, adminRoute, getAllProducts)  //only authenticated 'admin' j all products access kari sake

router.get('/featured-products', getFeaturedProducts)

router.get('/category/:category', getProductsByCategory)

router.get('/recommended', recommendedProducts)

router.post("/", protectRoute, adminRoute, createProducts) //create products

router.patch('/:id', protectRoute, adminRoute, getProductFeatures)

router.delete("/:id", protectRoute, adminRoute, deleteProducts) //delete products by id

export default router