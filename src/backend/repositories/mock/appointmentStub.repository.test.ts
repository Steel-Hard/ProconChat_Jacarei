import { describe, expect, it, vi } from "vitest"
import NotFoundError from "../../errors/NotFoundError"
import {
    buildAppointmentDetail,
    buildChipCounts,
    buildListItem,
    FIXED_DATES,
    FIXED_NOW,
} from "./appointment.builders"
import { AppointmentRepositoryStub } from "./appointmentStub.repository"

describe("AppointmentRepositoryStub", () => {
    it("findById devolve timeline vazia e uma cópia do registro", async () => {
        const timeline = [{ id: "1", type: "STARTED", created_at: FIXED_NOW.toISOString(), generated_by_ai: false, data: {} }]
        const repository = new AppointmentRepositoryStub({ details: [buildAppointmentDetail({ timeline })] })

        const first = await repository.findById(1)
        first!.name = "Alterado no teste"
        const second = await repository.findById("a1b2c3d4-0000-0000-0000-000000000001")

        expect(first!.timeline).toEqual([])
        expect(second).toEqual(buildAppointmentDetail({ timeline: [] }))
    })

    it("findList devolve a lista pronta sem filtrar, ordenar nem recontar", async () => {
        const items = [
            buildListItem({ id: "3", name: "Zélia", status: "ATTENDED" }),
            buildListItem({ id: "1", name: "Ana", status: "PENDING" }),
            buildListItem({ id: "2", name: "Bruno", status: "CANCELED" }),
        ]
        const chipCounts = buildChipCounts({ all: 90, pending: 7 })
        const repository = new AppointmentRepositoryStub({ list: { items, total: 45, chipCounts } })
        const filters = {
            status: "CONFIRMED" as const,
            search: "inexistente",
            sortBy: "name" as const,
            sortOrder: "asc" as const,
            page: 2,
            limit: 1,
        }

        const result = await repository.findList(filters, FIXED_NOW)

        expect(result).toEqual({ items, total: 45, chipCounts })
        expect(repository.findListCalls).toEqual([{ filters, now: FIXED_NOW }])
    })

    it("resolveTitles devolve só os títulos pedidos e não inventa os que faltam", async () => {
        const repository = new AppointmentRepositoryStub({
            titles: {
                categories: { 1: "Consumo", 2: "Saúde" },
                questions: { 10: "Troca de produto", 20: "Plano de saúde" },
            },
        })

        const result = await repository.resolveTitles([1, 3], [20, 30])

        expect(result).toEqual({ categories: { 1: "Consumo" }, questions: { 20: "Plano de saúde" } })
    })

    it("a ação sem registro lança NotFoundError", async () => {
        const repository = new AppointmentRepositoryStub({ details: [buildAppointmentDetail()] })

        const result = repository.claim("999", 10, FIXED_NOW)

        await expect(result).rejects.toBeInstanceOf(NotFoundError)
        await expect(result).rejects.toThrow("Agendamento não encontrado")
        expect(repository.actionCalls).toEqual([{ action: "claim", id: "999", actorUserId: 10, now: FIXED_NOW }])
    })

    it("a ação recusada por decideTransition não troca o registro", async () => {
        const afterAction = vi.fn()
        const attended = buildAppointmentDetail({
            status: "ATTENDED",
            assigned_user_id: "2",
            appointment_datetime: FIXED_DATES.threeDaysAgo,
        })
        const repository = new AppointmentRepositoryStub({ details: [attended], afterAction })

        const result = repository.claim("1", 10, FIXED_NOW)

        await expect(result).rejects.toMatchObject({ statusCode: 409, code: "ALREADY_ATTENDED" })
        expect(afterAction).not.toHaveBeenCalled()
        expect(await repository.findById("1")).toEqual(attended)
    })

    it("a ação sem afterAction no cenário lança erro de cenário incompleto", async () => {
        const repository = new AppointmentRepositoryStub({ details: [buildAppointmentDetail()] })

        const result = repository.claim("1", 10, FIXED_NOW)

        await expect(result).rejects.toThrow("Cenário incompleto: falta afterAction para a ação claim")
    })
})
