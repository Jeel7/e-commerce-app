import { client } from "../lib/redis.js"
import Product from "../models/Product.js"
import cloudinary from '../lib/cloudinary.js'

async function updateFeaturedProductCache(){  //redis ma pan data update karo
    try{
        const featuredProducts = await Product.find({isFeatured: true}).lean()
        await client.set("featured_products", JSON.stringify(featuredProducts))

    }catch(e){
        console.log(e)
    }
}

export const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find({})

        res.json({ products })

    } catch (e) {
        console.log(e)
        res.status(500).json({
            success: false,
            message: "Something went wrong, try again later!"
        })
    }
}

export const getFeaturedProducts = async (req, res) => {  // save them in redis & mongodb both

    try {
        let featuredProducts = await client.get("featured_products") //first check if redis have any feature prodcuts or not

        if (featuredProducts) {
            return res.json(JSON.parse(featuredProducts))  //convert it bcz, redis stores it them im 'string'
        }

        //else, not in redis => then fetch them from mongodb
        featuredProducts = await Product.find({ isFeatured: true }).lean()

        if (!featuredProducts) {
            return res.status(404).json({
                message: "No featured product available right now"
            })
        }

        //store it in redis for future quick access
        await client.set("featured_products", JSON.stringify(featuredProducts))

        res.json(featuredProducts)

    } catch (e) {
        console.log(e)
        res.status(500).json({
            success: false,
            message: "Something went wrong, try again later!"
        })
    }
}

//=> Get category wise products

export const getProductsByCategory = async (req, res) => {

    const { category } = req.params

    try {
        const products = await Product.find({ category })

        res.json({products})

    } catch (e) {
        console.log(e)
        res.status(500).json({
            success: false,
            message: "Something went wrong, try again later!"
        })
    }
}

//=> Recommended products

export const recommendedProducts = async (req, res) => {
    try {
        const products = await Product.aggregate([
            {
                $sample: { size: 3 }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    image: 1,
                    price: 1
                }
            }
        ])

        res.json(products)

    } catch (e) {
        console.log(e)
        res.status(500).json({
            success: false,
            message: "Something went wrong, try again later!"
        })
    }

}

//=> Create products with cloudinary

export const createProducts = async (req, res) => {

    const { name, description, price, image, category } = req.body

    try {
        let cloudinaryResponse = null

        if (image) {
            cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" })
        }

        const product = await Product.create({        //create product in database
            name,
            description,
            price,
            image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
            category
        })

        res.status(201).json(product)

    } catch (e) {
        console.log(e)
        res.status(500).json({
            success: false,
            message: "Something went wrong, try again later!"
        })
    }
}

//=> Get details of the product

export const getProductFeatures = async (req, res) => {
   
    try {
        const product = await Product.findById(req.params.id)

        if(product){
            product.isFeatured = !product.isFeatured

            const updatedProduct = await product.save()

            await updateFeaturedProductCache()          //redis

            res.json(updatedProduct)
        }else{
            res.status(404).json({
                message: "Product not found!"
            })
        }

    } catch (e) {
        console.log(e)
        res.status(500).json({
            success: false,
            message: "Something went wrong, try again later!"
        })
    }
}

//=> Delete products from databse & cloudinary both

export const deleteProducts = async (req, res) => {

    try {
        const product = await Product.findById(req.params.id)

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            })
        }

        if (product.image) {
            const publicId = product.image.split("/").pop().split(".")[0] // this will get the id of the img 

            try {
                await cloudinary.uploader.destroy(`products/${publicId}`)  //delete from cloudinary
                console.log("Image deleted successfully")
            } catch (e) {
                console.log(e)
            }
        }

        await Product.findByIdAndDelete(req.params.id)   //delete from mongodb databse
        res.json({
            message: "Product deleted successfully"
        })

    } catch (e) {
        console.log(e)
        res.status(500).json({
            success: false,
            message: "Something went wrong, try again later!"
        })
    }
}

