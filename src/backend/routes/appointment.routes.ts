import { Router } from "express"
import { AppointmentController } from "../controllers/appointment.controller"
import { requirePermission } from "../middleware/permission.middleware"
import { PgAppointmentRepository } from "../repositories/appointment.repository"
import { IAppointmentRepository } from "../repositories/appointment.repository.interface"
import {
  appointmentIdParamSchema,
  listAppointmentsQuerySchema,
  updateStatusBodySchema,
  validateRequest,
} from "../schemas/appointment.schema"
import { AppointmentService } from "../services/appointment.service"

export function createAppointmentRoutes(
  repository?: IAppointmentRepository,
): Router {
  const router = Router()
  const appointmentRepo = repository || new PgAppointmentRepository()
  const appointmentService = new AppointmentService(appointmentRepo)
  const controller = new AppointmentController(appointmentService)

  // Contador de agendamentos pendentes (rota específica antes de /:id para não colidir)
  router.get(
    "/pending-count",
    requirePermission("appointments.view"),
    controller.getPendingCount,
  )

  // Lista de agendamentos com filtros, busca, ordenação e paginação
  router.get(
    "/",
    requirePermission("appointments.view"),
    validateRequest({ query: listAppointmentsQuerySchema }),
    controller.listAppointments,
  )

  // Detalhe de um agendamento
  router.get(
    "/:id",
    requirePermission("appointments.view"),
    validateRequest({ params: appointmentIdParamSchema }),
    controller.getAppointmentDetail,
  )

  // Ações de status via PATCH
  router.patch(
    "/:id/status",
    requirePermission("appointments.manage"),
    validateRequest({
      params: appointmentIdParamSchema,
      body: updateStatusBodySchema,
    }),
    controller.updateAppointmentStatus,
  )

  // Ações explícitas via POST
  router.post(
    "/:id/claim",
    requirePermission("appointments.manage"),
    validateRequest({ params: appointmentIdParamSchema }),
    controller.claimAppointment,
  )

  router.post(
    "/:id/assumir",
    requirePermission("appointments.manage"),
    validateRequest({ params: appointmentIdParamSchema }),
    controller.claimAppointment,
  )

  router.post(
    "/:id/attended",
    requirePermission("appointments.manage"),
    validateRequest({ params: appointmentIdParamSchema }),
    controller.markAttended,
  )

  router.post(
    "/:id/no-show",
    requirePermission("appointments.manage"),
    validateRequest({ params: appointmentIdParamSchema }),
    controller.markNoShow,
  )

  return router
}

const defaultAppointmentRoutes = createAppointmentRoutes()
export default defaultAppointmentRoutes
