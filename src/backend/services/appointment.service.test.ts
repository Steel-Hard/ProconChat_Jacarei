import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
    buildAppointmentDetail,
    buildChipCounts,
    buildListItem,
    conversationEventsOf,
    conversationTimelineEvents,
    FIXED_DATES,
    FIXED_NOW,
} from "../repositories/mock/appointment.builders"
import { AppointmentRepositoryStub } from "../repositories/mock/appointmentStub.repository"
import { AppointmentService, createAppointmentService } from "./appointment.service"
import { toLocalDateString } from "../utils/date.utils"

const STATUS_AFTER_ACTION = { claim: "CONFIRMED", attended: "ATTENDED", no_show: "NO_SHOW", assign: "CONFIRMED" } as const
const EVENT_OF_ACTION = { claim: "CLAIMED", attended: "ATTENDED", no_show: "NO_SHOW", assign: "ASSIGNED" } as const
const MANAGER = { canManage: true }
const VIEWER = { canManage: false }
const PERMISSION_REQUIRED = { allowed: false, code: "PERMISSION_REQUIRED" }

function simpleAction(action: string): keyof typeof STATUS_AFTER_ACTION {
    if (action === "claim" || action === "attended" || action === "no_show" || action === "assign") {
        return action
    }
    throw new Error(`Cenário incompleto: ação ${action} sem afterAction`)
}
const LIST_CHIPS = buildChipCounts({ all: 45, pending: 20, confirmed: 15, attended: 5, no_show: 3, canceled: 2, waiting_record: 1 })

function serviceScenario(): AppointmentRepositoryStub {
    const carlos = { assigned_user_id: "2", assigned_user_name: "Carlos Atendente" }
    return new AppointmentRepositoryStub({
        details: [
            buildAppointmentDetail(),
            buildAppointmentDetail({ id: "2", status: "CONFIRMED", appointment_datetime: FIXED_DATES.afterTomorrow, ...carlos }),
            buildAppointmentDetail({ id: "4", status: "ATTENDED", appointment_datetime: FIXED_DATES.threeDaysAgo, ...carlos }),
            buildAppointmentDetail({ id: "6", status: "CANCELED", appointment_datetime: FIXED_DATES.inThreeDays }),
            buildAppointmentDetail({ id: "7", status: "PENDING", appointment_datetime: FIXED_DATES.todayEarly }),
            buildAppointmentDetail({ id: "8", status: "PENDING", appointment_datetime: FIXED_DATES.todayLate }),
        ],
        list: {
            items: [buildListItem(), buildListItem({ id: "7", appointment_datetime: FIXED_DATES.todayEarly })],
            total: 45,
            chipCounts: LIST_CHIPS,
        },
        pendingCount: 3,
        titles: {
            categories: { 10: "Cobrança" },
            questions: { 1: "Cobrança indevida de serviço não contratado" },
        },
        afterAction: (call, current) => ({
            ...current,
            status: STATUS_AFTER_ACTION[simpleAction(call.action)],
            assigned_user_id:
                call.assigneeUserId !== undefined
                    ? String(call.assigneeUserId)
                    : (current.assigned_user_id ?? String(call.actorUserId)),
            events: [
                {
                    id: String(current.events.length + 1),
                    type: EVENT_OF_ACTION[simpleAction(call.action)],
                    actor_user_id: String(call.actorUserId),
                    actor_user_name: null,
                    data: {},
                    created_at: (call.now ?? FIXED_NOW).toISOString(),
                },
                ...current.events,
            ],
        }),
    })
}

describe("appointment.service", () => {
    let repository: AppointmentRepositoryStub
    let service: AppointmentService

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] })
        vi.setSystemTime(FIXED_NOW)
        repository = serviceScenario()
        service = createAppointmentService({
            repository,
            conversationEvents: conversationEventsOf(conversationTimelineEvents("101")),
        })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe("listAppointments & Filtros", () => {
        it("retorna lista paginada com contagens de chips e estrutura esperada", async () => {
            const response = await service.listAppointments({})

            expect(response.items).toBeInstanceOf(Array)
            expect(response.total).toBe(45)
            expect(response.page).toBe(1)
            expect(response.limit).toBe(20)
            expect(response.totalPages).toBe(3)
            expect(repository.findListCalls[0]?.filters).toEqual({ page: 1, limit: 20 })

            expect(response.chipCounts).toEqual(LIST_CHIPS)

            const first = response.items[0]!
            expect(first).toHaveProperty("protocol")
            expect(first.protocol).toHaveLength(8)
            expect(first).toHaveProperty("cpf_masked")
            expect(first.cpf_masked).toMatch(/^\*{3}\.[0-9]{3}\.[0-9]{3}-\*{2}$/)
            expect(first).not.toHaveProperty("phone")
            expect(first).not.toHaveProperty("phone_encrypted")
        })
    })

    describe("getPendingCount", () => {
        it("retorna o número correto de agendamentos pendentes", async () => {
            const result = await service.getPendingCount()
            expect(result).toEqual({ count: 3 })
        })
    })

    describe("getAppointmentDetail", () => {
        it("retorna detalhes completos com eventos e timeline da sessão com títulos resolvidos", async () => {
            const detail = await service.getAppointmentDetail(1, MANAGER)
            expect(detail.id).toBe("1")
            expect(detail.protocol).toBe("A1B2C3D4")
            expect(detail.name).toBe("Maria Silva")
            expect(detail.category_name).toBe("Cobrança")
            expect(detail.documents_sent).toHaveProperty("group")
            expect(detail.documents_sent).toHaveProperty("question")
            expect(detail.events).toBeInstanceOf(Array)
            expect(detail.timeline).toBeInstanceOf(Array)
            expect(detail.timeline.length).toBeGreaterThan(0)

            const catStep = detail.timeline.find((t) => t.type === "CATEGORY_CHOSEN")
            if (catStep) {
                expect(catStep.data.category_title).toContain("Cobrança")
            }
        })

        it("a linha do tempo não traz texto pronto e traz os títulos resolvidos", async () => {
            const detail = await service.getAppointmentDetail(1, MANAGER)

            for (const step of detail.timeline) {
                expect(Object.keys(step).sort()).toEqual(["created_at", "data", "generated_by_ai", "id", "type"])
                expect(step.data).not.toHaveProperty("type")
                expect(step.data).not.toHaveProperty("createdAt")
            }
            const byType = Object.fromEntries(detail.timeline.map((step) => [step.type, step]))
            expect(byType.CATEGORY_CHOSEN?.data).toEqual({ categoryId: 10, category_title: "Cobrança" })
            expect(byType.QUESTION_CHOSEN?.data).toEqual({
                categoryId: 10,
                category_title: "Cobrança",
                questionId: 1,
                question_title: "Cobrança indevida de serviço não contratado",
            })
            expect(byType.ANSWER_SENT?.generated_by_ai).toBe(true)
            expect(byType.RESOLVED_ANSWERED?.data).toEqual({ resolved: false })
            expect(byType.RESOLVED_ANSWERED?.generated_by_ai).toBe(false)
            expect(byType.STARTED?.data).toEqual({})
        })

        it("registra só o código do erro quando a linha do tempo falha", async () => {
            const logger = { error: vi.fn() }
            const failure = Object.assign(new Error("falha com dado sensível 5500000000999"), { code: "ECONNREFUSED" })
            const failingService = createAppointmentService({
                repository,
                conversationEvents: {
                    record: vi.fn(),
                    finish: vi.fn(),
                    listBySession: vi.fn().mockRejectedValue(failure),
                },
                logger,
            })

            const detail = await failingService.getAppointmentDetail(1, MANAGER)

            expect(detail.timeline).toEqual([])
            expect(logger.error).toHaveBeenCalledTimes(1)
            expect(logger.error).toHaveBeenCalledWith(expect.any(String), { appointmentId: "1", code: "ECONNREFUSED" })
            expect(JSON.stringify(logger.error.mock.calls)).not.toContain("5500000000999")
        })

        it("sem appointments.manage, todas as ações de gerenciar vêm com PERMISSION_REQUIRED", async () => {
            const detail = await service.getAppointmentDetail(1, VIEWER)

            expect(detail.available_actions).toEqual({
                claim: PERMISSION_REQUIRED,
                attended: PERMISSION_REQUIRED,
                no_show: PERMISSION_REQUIRED,
                assign: PERMISSION_REQUIRED,
                correct_record: PERMISSION_REQUIRED,
                add_note: PERMISSION_REQUIRED,
            })
        })

        it("com appointments.manage, as ações seguem as regras de status", async () => {
            const detail = await service.getAppointmentDetail(1, MANAGER)

            expect(detail.available_actions).toEqual({
                claim: { allowed: true, code: null },
                attended: { allowed: false, code: "ATTENDANCE_NOT_YET_AVAILABLE" },
                no_show: { allowed: false, code: "NO_SHOW_NOT_YET_AVAILABLE" },
                assign: { allowed: true, code: null },
                correct_record: { allowed: false, code: "RECORD_NOT_CORRECTABLE" },
                add_note: { allowed: true, code: null },
            })
        })

        it("a resposta de uma ação usa a permissão recebida para montar as ações disponíveis", async () => {
            const detail = await service.claimAppointment(1, 42, VIEWER)

            expect(detail.available_actions.assign).toEqual(PERMISSION_REQUIRED)
        })

        it("lança NotFoundError para agendamento inexistente", async () => {
            await expect(service.getAppointmentDetail(9999, MANAGER)).rejects.toThrow("Agendamento não encontrado")
        })
    })

    describe("claimAppointment (Assumir para mim)", () => {
        it("assume agendamento Pendente passando para Confirmado com o id do usuário", async () => {
            const result = await service.claimAppointment(1, 42, MANAGER)
            expect(result.status).toBe("CONFIRMED")
            expect(result.assigned_user_id).toBe("42")

            const claimedEvent = result.events.find((e) => e.type === "CLAIMED")
            expect(claimedEvent).toBeDefined()
            expect(claimedEvent?.actor_user_id).toBe("42")
            expect(repository.actionCalls).toEqual([{ action: "claim", id: "1", actorUserId: 42, now: FIXED_NOW }])
        })

        it("recusa assumir agendamento que não esteja Pendente", async () => {
            await expect(service.claimAppointment(2, 42, MANAGER)).rejects.toThrow(
                "Apenas agendamentos pendentes podem ser assumidos",
            )
        })
    })

    describe("assignAppointment (Atribuir a outro funcionário)", () => {
        it("repassa o destino ao repositório e devolve o detalhe atualizado", async () => {
            const result = await service.assignAppointment(1, 7, 42, MANAGER)

            expect(result.status).toBe("CONFIRMED")
            expect(result.assigned_user_id).toBe("7")
            expect(repository.actionCalls).toEqual([
                { action: "assign", id: "1", actorUserId: 42, assigneeUserId: 7, now: FIXED_NOW },
            ])
        })
    })

    describe("markAttended (Marcar como atendido)", () => {
        it("marca como atendido com sucesso quando a data é hoje ou no passado", async () => {
            const result = await service.markAttended(7, 42, MANAGER)
            expect(result.status).toBe("ATTENDED")
            expect(result.assigned_user_id).toBe("42")

            const attendedEvent = result.events.find((e) => e.type === "ATTENDED")
            expect(attendedEvent).toBeDefined()
            expect(repository.actionCalls).toEqual([{ action: "attended", id: "7", actorUserId: 42, now: FIXED_NOW }])
        })

        it("recusa marcar como atendido se for para data futura", async () => {
            await expect(service.markAttended(1, 42, MANAGER)).rejects.toThrow(
                "Disponível a partir do dia do atendimento",
            )
            await expect(service.markAttended(1, 42, MANAGER)).rejects.toMatchObject({
                statusCode: 409,
                code: "ATTENDANCE_NOT_YET_AVAILABLE",
            })
        })

        it("recusa se agendamento já foi atendido, cancelado ou não compareceu", async () => {
            await expect(service.markAttended(4, 42, MANAGER)).rejects.toThrow(
                "Agendamento já foi marcado como atendido",
            )
            await expect(service.markAttended(6, 42, MANAGER)).rejects.toThrow(
                "Não é possível registrar atendimento para um agendamento cancelado",
            )
        })
    })

    describe("markNoShow (Marcar como não compareceu)", () => {
        it("marca como não compareceu com sucesso quando o horário já passou", async () => {
            const todayStr = toLocalDateString()
            const now = new Date(`${todayStr}T12:00:00-03:00`)
            const result = await service.markNoShow(7, 42, MANAGER, now)
            expect(result.status).toBe("NO_SHOW")

            const noShowEvent = result.events.find((e) => e.type === "NO_SHOW")
            expect(noShowEvent).toBeDefined()
            expect(repository.actionCalls).toEqual([{ action: "no_show", id: "7", actorUserId: 42, now }])
        })

        it("recusa marcar como não compareceu se o horário ainda não passou", async () => {
            const todayStr = toLocalDateString()
            const now = new Date(`${todayStr}T10:00:00-03:00`)
            await expect(service.markNoShow(8, 42, MANAGER, now)).rejects.toThrow(
                "Disponível apenas após o horário do agendamento",
            )
            await expect(service.markNoShow(8, 42, MANAGER, now)).rejects.toMatchObject({
                statusCode: 409,
                code: "NO_SHOW_NOT_YET_AVAILABLE",
            })
        })
    })
})
