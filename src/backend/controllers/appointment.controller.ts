import { NextFunction, Request, Response } from "express"
import { appointmentService as defaultAppointmentService, AppointmentService } from "../services/appointment.service"
import { ListAppointmentsQuery, UpdateStatusBody } from "../schemas/appointment.schema"
import { AppointmentListFilters } from "../types/appointment.types"
import UnauthorizedError from "../errors/UnauthorizedError"

interface AppointmentControllerDependencies {
    service: AppointmentService
}

class AppointmentController {
    private service: AppointmentService

    constructor({ service }: AppointmentControllerDependencies = { service: defaultAppointmentService }) {
        this.service = service
    }

    public async listAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = req.query as unknown as ListAppointmentsQuery
            const filters: AppointmentListFilters = {
                search: query.search,
                status: query.status,
                period: query.period,
                responsible: query.responsible,
                sortBy: query.sortBy,
                sortOrder: query.sortOrder,
                page: query.page,
                limit: query.limit,
                currentUserId: req.authUser?.id,
            }
            const result = await this.service.listAppointments(filters)
            res.status(200).json({ data: result })
        } catch (error) {
            next(error)
        }
    }

    public async getPendingCount(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await this.service.getPendingCount()
            res.status(200).json({ data: result })
        } catch (error) {
            next(error)
        }
    }

    public async getAppointmentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params as { id: string }
            const result = await this.service.getAppointmentDetail(id)
            res.status(200).json({ data: result })
        } catch (error) {
            next(error)
        }
    }

    public async updateAppointmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params as { id: string }
            const { action } = req.body as UpdateStatusBody

            if (!req.authUser) {
                throw new UnauthorizedError("Authentication required")
            }
            const actorUserId = req.authUser.id

            let result
            if (action === "claim") {
                result = await this.service.claimAppointment(id, actorUserId)
            } else if (action === "attended") {
                result = await this.service.markAttended(id, actorUserId)
            } else if (action === "no_show") {
                result = await this.service.markNoShow(id, actorUserId)
            }

            res.status(200).json({ data: result })
        } catch (error) {
            next(error)
        }
    }
}

export default AppointmentController
