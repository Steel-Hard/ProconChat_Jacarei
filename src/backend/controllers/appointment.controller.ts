import { NextFunction, Request, Response } from "express"
import { appointmentService as defaultAppointmentService, AppointmentService } from "../services/appointment.service"
import { listAppointmentsQuerySchema, UpdateStatusBody } from "../schemas/appointment.schema"
import { AppointmentListFilters } from "../types/appointment.types"
import UnauthorizedError from "../errors/UnauthorizedError"

export interface AppointmentController {
    listAppointments(req: Request, res: Response, next: NextFunction): Promise<void>
    getPendingCount(req: Request, res: Response, next: NextFunction): Promise<void>
    getAppointmentDetail(req: Request, res: Response, next: NextFunction): Promise<void>
    updateAppointmentStatus(req: Request, res: Response, next: NextFunction): Promise<void>
}

export function createAppointmentController(service: AppointmentService = defaultAppointmentService): AppointmentController {
    return {
        async listAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
            try {
                const query = listAppointmentsQuerySchema.parse(req.query)
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
                const result = await service.listAppointments(filters)
                res.status(200).json({ data: result })
            } catch (error) {
                next(error)
            }
        },

        async getPendingCount(_req: Request, res: Response, next: NextFunction): Promise<void> {
            try {
                const result = await service.getPendingCount()
                res.status(200).json({ data: result })
            } catch (error) {
                next(error)
            }
        },

        async getAppointmentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
            try {
                const { id } = req.params as { id: string }
                const result = await service.getAppointmentDetail(id)
                res.status(200).json({ data: result })
            } catch (error) {
                next(error)
            }
        },

        async updateAppointmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
            try {
                const { id } = req.params as { id: string }
                const { action } = req.body as UpdateStatusBody

                if (!req.authUser) {
                    throw new UnauthorizedError("Authentication required")
                }
                const actorUserId = req.authUser.id

                let result
                if (action === "claim") {
                    result = await service.claimAppointment(id, actorUserId)
                } else if (action === "attended") {
                    result = await service.markAttended(id, actorUserId)
                } else if (action === "no_show") {
                    result = await service.markNoShow(id, actorUserId)
                }

                res.status(200).json({ data: result })
            } catch (error) {
                next(error)
            }
        },
    }
}

export const appointmentController = createAppointmentController()
export default appointmentController
