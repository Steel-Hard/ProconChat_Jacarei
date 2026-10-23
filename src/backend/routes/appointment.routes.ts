import { RequestHandler, Router } from "express"
import AppointmentController from "../controllers/appointment.controller"
import { requireAuth, requirePermission } from "../middleware/auth.middleware"
import { appointmentRepository as defaultAppointmentRepository } from "../repositories/appointment.repository"
import { AppointmentRepository } from "../repositories/appointment.repository.interface"
import { validateRequest } from "../middleware/validateRequest.middleware"
import {
    addNoteBodySchema,
    appointmentIdParamSchema,
    listAppointmentsQuerySchema,
    updateStatusBodySchema,
} from "../schemas/appointment.schema"
import { createAppointmentService } from "../services/appointment.service"
import { conversationEventService as defaultConversationEventService, ConversationEventService } from "../services/conversationEvent.service"

interface AppointmentRoutesDependencies {
    repository?: AppointmentRepository
    conversationEvents?: ConversationEventService
    authMiddleware?: RequestHandler
}

export class AppointmentRoutes {
    private appointmentController: AppointmentController
    private router: Router = Router()

    constructor({
        repository = defaultAppointmentRepository,
        conversationEvents = defaultConversationEventService,
        authMiddleware = requireAuth,
    }: AppointmentRoutesDependencies = {}) {
        const service = createAppointmentService({ repository, conversationEvents })
        this.appointmentController = new AppointmentController({ service })
        const controller = this.appointmentController

        this.router.use(authMiddleware)

        this.router.get(
            "/pending-count",
            requirePermission("appointments.view"),
            controller.getPendingCount.bind(controller),
        )

        this.router.get(
            "/staff",
            requirePermission("appointments.view"),
            controller.listStaff.bind(controller),
        )

        this.router.get(
            "/",
            requirePermission("appointments.view"),
            validateRequest({ query: listAppointmentsQuerySchema }),
            controller.listAppointments.bind(controller),
        )

        this.router.get(
            "/:id",
            requirePermission("appointments.view"),
            validateRequest({ params: appointmentIdParamSchema }),
            controller.getAppointmentDetail.bind(controller),
        )

        this.router.patch(
            "/:id/status",
            requirePermission("appointments.manage"),
            validateRequest({
                params: appointmentIdParamSchema,
                body: updateStatusBodySchema,
            }),
            controller.updateAppointmentStatus.bind(controller),
        )

        this.router.post(
            "/:id/notes",
            requirePermission("appointments.manage"),
            validateRequest({
                params: appointmentIdParamSchema,
                body: addNoteBodySchema,
            }),
            controller.addNote.bind(controller),
        )
    }

    public getRouter(): Router {
        return this.router
    }
}

const appointmentRoutes = new AppointmentRoutes().getRouter()
export default appointmentRoutes
