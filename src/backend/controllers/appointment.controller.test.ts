import { beforeEach, describe, expect, it, vi } from "vitest"
import { Request, Response } from "express"
import { AppointmentController } from "./appointment.controller"
import { AppointmentService } from "../services/appointment.service"
import { MockAppointmentRepository } from "../repositories/appointmentMock.repository"

describe("appointment.controller", () => {
  let controller: AppointmentController
  let service: AppointmentService
  let repository: MockAppointmentRepository

  beforeEach(() => {
    repository = new MockAppointmentRepository(true)
    service = new AppointmentService(repository)
    controller = new AppointmentController(service)
  })

  function mockResponse(): Response {
    const res: Partial<Response> = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res as Response
  }

  it("listAppointments chama o serviço e devolve 200", async () => {
    const req = {
      query: { page: 1, limit: 10 },
      user: { id: 1, is_admin: true },
    } as unknown as Request
    const res = mockResponse()
    const next = vi.fn()

    await controller.listAppointments(req, res, next)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
        page: 1,
        limit: 10,
      }),
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("getPendingCount devolve 200 com envelope { data: { count } }", async () => {
    const req = {} as Request
    const res = mockResponse()
    const next = vi.fn()

    await controller.getPendingCount(req, res, next)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ count: expect.any(Number) }),
      }),
    )
  })

  it("getAppointmentDetail devolve 200 com envelope { data: detail }", async () => {
    const req = { params: { id: "1" } } as unknown as Request
    const res = mockResponse()
    const next = vi.fn()

    await controller.getAppointmentDetail(req, res, next)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: "1", name: "Maria Silva" }),
      }),
    )
  })

  it("updateAppointmentStatus com action 'claim' devolve 200", async () => {
    const req = {
      params: { id: "1" },
      body: { action: "claim" },
      user: { id: 10 },
    } as unknown as Request
    const res = mockResponse()
    const next = vi.fn()

    await controller.updateAppointmentStatus(req, res, next)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CONFIRMED",
          assigned_user_id: "10",
        }),
      }),
    )
  })

  it("propaga erro para o middleware next se o serviço lançar", async () => {
    const req = { params: { id: "9999" } } as unknown as Request
    const res = mockResponse()
    const next = vi.fn()

    await controller.getAppointmentDetail(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})
