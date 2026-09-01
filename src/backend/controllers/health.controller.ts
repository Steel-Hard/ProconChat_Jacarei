import { Request, Response, NextFunction } from "express"
import HealthService from "../services/health.service"
import { SuccessResponseBody } from "../types/successResponse.types"

class HealthController {
    private healthService: HealthService

    constructor() {
        this.healthService = new HealthService()
    }

    public check(_req: Request, res: Response, next: NextFunction): void {
        try {
            const result = this.healthService.check()
            const response: SuccessResponseBody<typeof result> = { data: result }
            res.status(200).json(response)
        } catch (error: unknown) {
            next(error)
        }
    }
}

export default HealthController
