import { beforeEach, describe, expect, it } from "vitest"
import { MockAppointmentRepository } from "../repositories/mock/appointmentMock.repository"
import { AppointmentService, createAppointmentService } from "./appointment.service"
import { toLocalDateString } from "../utils/date.utils"

describe("appointment.service", () => {
    let repository: MockAppointmentRepository
    let service: AppointmentService

    beforeEach(() => {
        repository = new MockAppointmentRepository(true)
        service = createAppointmentService({
            repository,
            conversationEvents: repository.conversationEventService(),
        })
    })

    describe("listAppointments & Filtros", () => {
        it("retorna lista paginada com contagens de chips e estrutura esperada", async () => {
            const response = await service.listAppointments({ page: 1, limit: 20 })

            expect(response.items).toBeInstanceOf(Array)
            expect(response.total).toBe(9)
            expect(response.page).toBe(1)
            expect(response.limit).toBe(20)
            expect(response.totalPages).toBe(1)

            expect(response.chipCounts).toMatchObject({
                all: 9,
                pending: expect.any(Number),
                confirmed: expect.any(Number),
                attended: expect.any(Number),
                no_show: expect.any(Number),
                canceled: expect.any(Number),
                waiting_record: expect.any(Number),
            })

            const first = response.items[0]
            expect(first).toHaveProperty("protocol")
            expect(first.protocol).toHaveLength(8)
            expect(first).toHaveProperty("cpf_masked")
            expect(first.cpf_masked).toMatch(/^\*{3}\.[0-9]{3}\.[0-9]{3}-\*{2}$/)
            expect(first).not.toHaveProperty("phone")
            expect(first).not.toHaveProperty("phone_encrypted")
        })

        it("busca por nome ignorando maiúsculas e acentos", async () => {
            const response = await service.listAppointments({ search: "maria" })
            expect(response.items.some((a) => a.name === "Maria Silva")).toBe(true)

            const responseAccented = await service.listAppointments({ search: "patricia" })
            expect(responseAccented.items.some((a) => a.name === "Patrícia Souza")).toBe(true)
        })

        it("busca por protocolo pelo início", async () => {
            const response = await service.listAppointments({ search: "a1b2c3d4" })
            expect(response.items).toHaveLength(1)
            expect(response.items[0].name).toBe("Maria Silva")
        })

        it("busca por CPF de 11 dígitos compara por hash e preserva sigilo", async () => {
            const response = await service.listAppointments({ search: "11144477735" })
            expect(response.items).toHaveLength(1)
            expect(response.items[0].name).toBe("Maria Silva")
            expect(response.items[0].cpf_masked).toBe("***.444.777-**")
        })

        it("busca por CPF formatado limpa a pontuação e encontra o cidadão", async () => {
            const response = await service.listAppointments({ search: "111.444.777-35" })
            expect(response.items).toHaveLength(1)
            expect(response.items[0].name).toBe("Maria Silva")
            expect(response.items[0].cpf_masked).toBe("***.444.777-**")
        })

        it("filtra por status PENDING e CONFIRMED", async () => {
            const pendingRes = await service.listAppointments({ status: "PENDING" })
            expect(pendingRes.items.every((a) => a.status === "PENDING")).toBe(true)

            const confirmedRes = await service.listAppointments({ status: "CONFIRMED" })
            expect(confirmedRes.items.every((a) => a.status === "CONFIRMED")).toBe(true)
        })

        it("filtra por waiting_record (confirmados com horário já passado)", async () => {
            const response = await service.listAppointments({ status: "waiting_record" })
            expect(response.items.every((a) => a.status === "CONFIRMED" && a.waiting_record)).toBe(true)
        })

        it("filtra por responsável: unassigned e específico", async () => {
            const unassignedRes = await service.listAppointments({ responsible: "unassigned" })
            expect(unassignedRes.items.every((a) => a.assigned_user_id === null)).toBe(true)

            const assignedRes = await service.listAppointments({ responsible: "2" })
            expect(assignedRes.items.every((a) => a.assigned_user_id === "2")).toBe(true)
        })

        it("ordena por nome crescente e decrescente", async () => {
            const ascRes = await service.listAppointments({ sortBy: "name", sortOrder: "asc" })
            const names = ascRes.items.map((a) => a.name)
            const sortedNames = [...names].sort((a, b) => a.localeCompare(b))
            expect(names).toEqual(sortedNames)

            const descRes = await service.listAppointments({ sortBy: "name", sortOrder: "desc" })
            expect(descRes.items[0].name).toBe(sortedNames[sortedNames.length - 1])
        })

        it("com period=all e chip ATTENDED ordena do mais recente para o mais antigo", async () => {
            const res = await service.listAppointments({ status: "ATTENDED", period: "all" })
            for (let i = 1; i < res.items.length; i++) {
                const prev = new Date(res.items[i - 1].appointment_datetime).getTime()
                const curr = new Date(res.items[i].appointment_datetime).getTime()
                expect(prev).toBeGreaterThanOrEqual(curr)
            }
        })
    })

    describe("getPendingCount", () => {
        it("retorna o número correto de agendamentos pendentes", async () => {
            const result = await service.getPendingCount()
            expect(result.count).toBe(repository.appointments.filter((a) => a.status === "PENDING").length)
        })
    })

    describe("getAppointmentDetail", () => {
        it("retorna detalhes completos com eventos e timeline da sessão com títulos resolvidos", async () => {
            const detail = await service.getAppointmentDetail(1)
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
            const detail = await service.getAppointmentDetail(1)

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

        it("detecta quando a lista de documentos enviada difere da configuração atual", async () => {
            const detail = await service.getAppointmentDetail(9)
            expect(detail.is_documents_config_different).toBe(true)

            const detailNormal = await service.getAppointmentDetail(1)
            expect(detailNormal.is_documents_config_different).toBe(false)
        })

        it("lança NotFoundError para agendamento inexistente", async () => {
            await expect(service.getAppointmentDetail(9999)).rejects.toThrow("Agendamento não encontrado")
        })
    })

    describe("claimAppointment (Assumir para mim)", () => {
        it("assume agendamento Pendente passando para Confirmado com o id do usuário", async () => {
            const result = await service.claimAppointment(1, 42)
            expect(result.status).toBe("CONFIRMED")
            expect(result.assigned_user_id).toBe("42")

            const claimedEvent = result.events.find((e) => e.type === "CLAIMED")
            expect(claimedEvent).toBeDefined()
            expect(claimedEvent?.actor_user_id).toBe("42")
        })

        it("recusa assumir agendamento que não esteja Pendente", async () => {
            await expect(service.claimAppointment(2, 42)).rejects.toThrow(
                "Apenas agendamentos pendentes podem ser assumidos",
            )
        })
    })

    describe("markAttended (Marcar como atendido)", () => {
        it("marca como atendido com sucesso quando a data é hoje ou no passado", async () => {
            const result = await service.markAttended(7, 42)
            expect(result.status).toBe("ATTENDED")
            expect(result.assigned_user_id).toBe("42")

            const attendedEvent = result.events.find((e) => e.type === "ATTENDED")
            expect(attendedEvent).toBeDefined()
        })

        it("num pendente, assume automaticamente para quem clicou registrando os dois eventos", async () => {
            const result = await service.markAttended(7, 42)
            expect(result.assigned_user_id).toBe("42")

            const claimedEvent = result.events.find((e) => e.type === "CLAIMED")
            const attendedEvent = result.events.find((e) => e.type === "ATTENDED")
            expect(claimedEvent).toBeDefined()
            expect(attendedEvent).toBeDefined()
        })

        it("recusa marcar como atendido se for para data futura", async () => {
            await expect(service.markAttended(1, 42)).rejects.toThrow(
                "Disponível a partir do dia do atendimento",
            )
            await expect(service.markAttended(1, 42)).rejects.toMatchObject({
                statusCode: 409,
                code: "ATTENDANCE_NOT_YET_AVAILABLE",
            })
        })

        it("recusa se agendamento já foi atendido, cancelado ou não compareceu", async () => {
            await expect(service.markAttended(4, 42)).rejects.toThrow(
                "Agendamento já foi marcado como atendido",
            )
            await expect(service.markAttended(6, 42)).rejects.toThrow(
                "Não é possível registrar atendimento para um agendamento cancelado",
            )
        })
    })

    describe("markNoShow (Marcar como não compareceu)", () => {
        it("marca como não compareceu com sucesso quando o horário já passou", async () => {
            const todayStr = toLocalDateString()
            const now = new Date(`${todayStr}T12:00:00-03:00`)
            const result = await service.markNoShow(7, 42, now)
            expect(result.status).toBe("NO_SHOW")

            const noShowEvent = result.events.find((e) => e.type === "NO_SHOW")
            expect(noShowEvent).toBeDefined()
        })

        it("num pendente, assume automaticamente para quem clicou", async () => {
            const todayStr = toLocalDateString()
            const now = new Date(`${todayStr}T12:00:00-03:00`)
            const result = await service.markNoShow(7, 42, now)
            expect(result.assigned_user_id).toBe("42")

            const claimedEvent = result.events.find((e) => e.type === "CLAIMED")
            const noShowEvent = result.events.find((e) => e.type === "NO_SHOW")
            expect(claimedEvent).toBeDefined()
            expect(noShowEvent).toBeDefined()
        })

        it("recusa marcar como não compareceu se o horário ainda não passou", async () => {
            const todayStr = toLocalDateString()
            const now = new Date(`${todayStr}T10:00:00-03:00`)
            await expect(service.markNoShow(8, 42, now)).rejects.toThrow(
                "Disponível apenas após o horário do agendamento",
            )
            await expect(service.markNoShow(8, 42, now)).rejects.toMatchObject({
                statusCode: 409,
                code: "NO_SHOW_NOT_YET_AVAILABLE",
            })
        })
    })
})
