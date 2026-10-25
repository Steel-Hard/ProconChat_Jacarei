import { NextFunction, Request, Response } from "express"
import UnauthorizedError from "../errors/UnauthorizedError"
import { IScheduleService, scheduleService } from "../services/schedule.service"
import { ScheduleConfigInput } from "../types/schedule.types"

interface ScheduleControllerDependencies {
    service?: IScheduleService
}

class ScheduleController {
    private service: IScheduleService

    constructor({ service = scheduleService }: ScheduleControllerDependencies = {}) {
        this.service = service
    }

    public async getConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const config = await this.service.getConfig()
            res.status(200).json({ data: config })
        } catch (error) {
            next(error)
        }
    }

    public async saveConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const actorUserId = this.userId(req)
            const updated = await this.service.saveConfig(
                req.body as ScheduleConfigInput,
                actorUserId,
            )
            res.status(200).json({ data: updated })
        } catch (error) {
            next(error)
        }
    }

    public async getPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const month = typeof req.query.month === "string" ? req.query.month : undefined
            const preview = await this.service.getMonthlyPreview({ month })
            res.status(200).json({ data: preview })
        } catch (error) {
            next(error)
        }
    }

    public async postPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { month, config } = req.body as {
                month?: string
                config?: ScheduleConfigInput
            }
            const preview = await this.service.getMonthlyPreview({
                month,
                draftConfig: config,
            })
            res.status(200).json({ data: preview })
        } catch (error) {
            next(error)
        }
    }

    public async getBookedDays(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const bookedDays = await this.service.getBookedDays()
            res.status(200).json({ data: bookedDays })
        } catch (error) {
            next(error)
        }
    }

    private userId(req: Request): number {
        if (!req.authUser) {
            throw new UnauthorizedError("Authentication required")
        }
        return req.authUser.id
    }
}

export default ScheduleController
