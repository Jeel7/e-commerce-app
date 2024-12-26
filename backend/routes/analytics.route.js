import express from 'express'
import { adminRoute, protectRoute } from '../middleware/auth.middleware.js'
import { getAnalysisData } from '../controllers/analytics.controller.js'

const router = express.Router()

router.get('/', protectRoute, adminRoute, getAnalysisData)

export default router