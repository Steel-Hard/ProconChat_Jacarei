import { NextFunction, Request, Response } from "express"
import { AppointmentService } from "../services/appointment.service"
import { AddNoteBody, CalendarQuery, ListAppointmentsQuery, UpdateStatusBody } from "../schemas/appointment.schema"
import { AppointmentCalendarService } from "../services/appointmentCalendar.service"
import { AppointmentListFilters } from "../types/appointment.types"
import UnauthorizedError from "../errors/UnauthorizedError"
import { ActionAccess } from "../services/appointmentTransitions"
import { AuthenticatedUser } from "../types/auth.types"

function accessOf(user: AuthenticatedUser | undefined): ActionAccess {
    return { canManage: Boolean(user && (user.isAdmin || user.permissions.includes("appointments.manage"))) }
}

interface AppointmentControllerDependencies {
    service: AppointmentService
    calendar: AppointmentCalendarService
}

class AppointmentController {
    private service: AppointmentService
    private calendar: AppointmentCalendarService

    constructor({ service, calendar }: AppointmentControllerDependencies) {
        this.service = service
        this.calendar = calendar
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

    public async listStaff(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await this.service.listStaff()
            res.status(200).json({ data: result })
        } catch (error) {
            next(error)
        }
    }

    public async getAppointmentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params as { id: string }
            const result = await this.service.getAppointmentDetail(id, accessOf(req.authUser))
            res.status(200).json({ data: result })
        } catch (error) {
            next(error)
        }
    }

    public async updateAppointmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params as { id: string }
            const body = req.body as UpdateStatusBody

            if (!req.authUser) {
                throw new UnauthorizedError("Authentication required")
            }
            const actorUserId = req.authUser.id
            const access = accessOf(req.authUser)

            let result
            if (body.action === "claim") {
                result = await this.service.claimAppointment(id, actorUserId, access)
            } else if (body.action === "attended") {
                result = await this.service.markAttended(id, actorUserId, access)
            } else if (body.action === "no_show") {
                result = await this.service.markNoShow(id, actorUserId, access)
            } else if (body.action === "assign") {
                result = await this.service.assignAppointment(id, body.assigneeUserId, actorUserId, access)
            } else {
                const corrected = await this.service.correctRecord(id, actorUserId, access)
                res.status(200).json(
                    corrected.warning ? { data: corrected.detail, warning: corrected.warning } : { data: corrected.detail },
                )
                return
            }

            res.status(200).json({ data: result })
        } catch (error) {
            next(error)
        }
    }

    public async addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params as { id: string }
            const { text } = req.body as AddNoteBody
            if (!req.authUser) {
                throw new UnauthorizedError("Authentication required")
            }
            const result = await this.service.addNote(id, req.authUser.id, text, accessOf(req.authUser))
            res.status(201).json({ data: result })
        } catch (error) {
            next(error)
        }
    }

    public async getCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = req.query as unknown as CalendarQuery
            const result = await this.calendar.getCalendar({
                date: query.date,
                status: query.status,
                responsible: query.responsible,
                currentUserId: req.authUser?.id,
            })
            res.status(200).json({ data: result })
        } catch (error) {
            next(error)
        }
    }
}

export default AppointmentController
