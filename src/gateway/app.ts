import express, { Request, Response, NextFunction } from "express"
import cors from "cors"
import helmet from "helmet"
import dotenv from "dotenv"
import validateEnv from "./utils/validateEnv"
import requestLoggerMiddleware from "./middleware/requestLogger.middleware"
import errorHandler from "./middleware/errorHandler.middleware"
import NotFoundError from "./errors/NotFoundError"
import healthRoutes from "./routes/health.routes"
import whatsappWebhookRoutes from "./routes/whatsappWebhook.routes"

dotenv.config({ quiet: true })

validateEnv()

const app = express()

app.use(helmet())
app.use(cors())
app.use(requestLoggerMiddleware)
app.use("/webhooks/whatsapp", whatsappWebhookRoutes)
app.use(express.json())

app.use("/health", healthRoutes)

app.use("/", (_req: Request, _res: Response, next: NextFunction) =>
    next(new NotFoundError("Route not found")),
)

app.use(errorHandler)

export default app
