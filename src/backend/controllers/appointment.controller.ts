import { NextFunction, Request, Response } from "express"
import { AppointmentService } from "../services/appointment.service"
import { UpdateStatusBody } from "../schemas/appointment.schema"

export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  listAppointments = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const filters = {
        ...req.query,
        currentUserId: req.user?.id,
      }
      const result = await this.appointmentService.listAppointments(
        filters as unknown as import("../types/appointment.types").AppointmentListFilters,
      )
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }

  getPendingCount = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.appointmentService.getPendingCount()
      res.status(200).json({ data: result })
    } catch (error) {
      next(error)
    }
  }

  getAppointmentDetail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string }
      const result = await this.appointmentService.getAppointmentDetail(id)
      res.status(200).json({ data: result })
    } catch (error) {
      next(error)
    }
  }

  updateAppointmentStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string }
      const { action } = req.body as UpdateStatusBody
      const actorUserId = req.user?.id || 1

      let result
      if (action === "claim") {
        result = await this.appointmentService.claimAppointment(id, actorUserId)
      } else if (action === "attended") {
        result = await this.appointmentService.markAttended(id, actorUserId)
      } else if (action === "no_show") {
        result = await this.appointmentService.markNoShow(id, actorUserId)
      }

      res.status(200).json({ data: result })
    } catch (error) {
      next(error)
    }
  }

  claimAppointment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string }
      const actorUserId = req.user?.id || 1
      const result = await this.appointmentService.claimAppointment(id, actorUserId)
      res.status(200).json({ data: result })
    } catch (error) {
      next(error)
    }
  }

  markAttended = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string }
      const actorUserId = req.user?.id || 1
      const result = await this.appointmentService.markAttended(id, actorUserId)
      res.status(200).json({ data: result })
    } catch (error) {
      next(error)
    }
  }

  markNoShow = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string }
      const actorUserId = req.user?.id || 1
      const result = await this.appointmentService.markNoShow(id, actorUserId)
      res.status(200).json({ data: result })
    } catch (error) {
      next(error)
    }
  }
}
