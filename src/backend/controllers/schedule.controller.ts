import { NextFunction, Request, Response } from "express"
import ForbiddenError from "../errors/ForbiddenError"
import UnauthorizedError from "../errors/UnauthorizedError"
import { IScheduleService, scheduleService } from "../services/schedule.service"
import {
    ScheduleConfigInput,
    ScheduleConflictResolution,
    ScheduleConflictResolutionSummary,
} from "../types/schedule.types"

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

    public async getConfigForDate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const date = typeof req.query.date === "string" ? req.query.date : ""
            const config = await this.service.getConfigForDate(date)
            res.status(200).json({ data: config })
        } catch (error) {
            next(error)
        }
    }

    public async listScheduledConfigs(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const versions = await this.service.listScheduledConfigs()
            res.status(200).json({ data: versions })
        } catch (error) {
            next(error)
        }
    }

    public async getCancellationNoticeState(
        _req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const state = await this.service.getCancellationNoticeState()
            res.status(200).json({ data: state })
        } catch (error) {
            next(error)
        }
    }

    public async saveConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const actorUserId = this.userId(req)
            const body = req.body as ScheduleConfigInput
            if (body.conflictResolution === "CANCEL") {
                this.ensureCanCancelAppointments(req)
            }
            let resolution: ScheduleConflictResolutionSummary | undefined
            const updated = await this.service.saveConfig(body, actorUserId, undefined, {
                onResolution: (summary) => {
                    resolution = summary
                },
            })
            res.status(200).json(resolution ? { data: updated, resolution } : { data: updated })
        } catch (error) {
            next(error)
        }
    }

    public async saveScheduledConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const actorUserId = this.userId(req)
            const body = req.body as ScheduleConfigInput
            if (body.conflictResolution === "CANCEL") {
                this.ensureCanCancelAppointments(req)
            }
            const effectiveFrom = typeof req.params.effectiveFrom === "string"
                ? req.params.effectiveFrom
                : ""
            let resolution: ScheduleConflictResolutionSummary | undefined
            const updated = await this.service.saveScheduledConfig(
                body,
                effectiveFrom,
                actorUserId,
                undefined,
                {
                    onResolution: (summary) => {
                        resolution = summary
                    },
                },
            )
            res.status(200).json(resolution ? { data: updated, resolution } : { data: updated })
        } catch (error) {
            next(error)
        }
    }

    public async deleteScheduledConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const effectiveFrom = typeof req.params.effectiveFrom === "string"
                ? req.params.effectiveFrom
                : ""
            const conflictResolution =
                req.query.conflictResolution === "KEEP" || req.query.conflictResolution === "CANCEL"
                    ? (req.query.conflictResolution as ScheduleConflictResolution)
                    : undefined
            if (conflictResolution === "CANCEL") {
                this.ensureCanCancelAppointments(req)
            }
            const actorUserId = conflictResolution ? this.userId(req) : undefined
            let resolution: ScheduleConflictResolutionSummary | undefined
            await this.service.deleteScheduledConfig(effectiveFrom, undefined, {
                actorUserId,
                conflictResolution,
                onResolution: (summary) => {
                    resolution = summary
                },
            })
            if (resolution) {
                res.status(200).json({ resolution })
                return
            }
            res.status(204).end()
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
            const { month, config, effectiveFrom } = req.body as {
                month?: string
                config?: ScheduleConfigInput
                effectiveFrom?: string
            }
            const preview = await this.service.getMonthlyPreview({
                month,
                draftConfig: config,
                draftEffectiveFrom: effectiveFrom,
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

    private ensureCanCancelAppointments(req: Request): void {
        const user = req.authUser
        if (!user) {
            throw new UnauthorizedError("Authentication required")
        }
        if (!user.isAdmin && !user.permissions.includes("appointments.manage")) {
            throw new ForbiddenError("Insufficient permission")
        }
    }
}

export default ScheduleController
