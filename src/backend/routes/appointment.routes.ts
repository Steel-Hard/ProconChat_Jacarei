import { RequestHandler, Router } from "express"
import { createAppointmentController } from "../controllers/appointment.controller"
import { requireAuth, requirePermission } from "../middleware/auth.middleware"
import { appointmentRepository as defaultAppointmentRepository } from "../repositories/appointment.repository"
import { AppointmentRepository } from "../repositories/appointment.repository.interface"
import { validateRequest } from "../middleware/validateRequest.middleware"
import {
    appointmentIdParamSchema,
    listAppointmentsQuerySchema,
    updateStatusBodySchema,
} from "../schemas/appointment.schema"
import { createAppointmentService } from "../services/appointment.service"
import { conversationEventService as defaultConversationEventService, ConversationEventService } from "../services/conversationEvent.service"

export function createAppointmentRoutes(
    repository: AppointmentRepository = defaultAppointmentRepository,
    conversationEvents: ConversationEventService = defaultConversationEventService,
    authMiddleware: RequestHandler = requireAuth,
): Router {
    const router = Router()
    const service = createAppointmentService({ repository, conversationEvents })
    const controller = createAppointmentController(service)

    router.use(authMiddleware)

    router.get(
        "/pending-count",
        requirePermission("appointments.view"),
        controller.getPendingCount,
    )

    router.get(
        "/",
        requirePermission("appointments.view"),
        validateRequest({ query: listAppointmentsQuerySchema }),
        controller.listAppointments,
    )

    router.get(
        "/:id",
        requirePermission("appointments.view"),
        validateRequest({ params: appointmentIdParamSchema }),
        controller.getAppointmentDetail,
    )

    router.patch(
        "/:id/status",
        requirePermission("appointments.manage"),
        validateRequest({
            params: appointmentIdParamSchema,
            body: updateStatusBodySchema,
        }),
        controller.updateAppointmentStatus,
    )

    return router
}

const defaultAppointmentRoutes = createAppointmentRoutes()
export default defaultAppointmentRoutes
