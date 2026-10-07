import { beforeEach, describe, expect, it } from "vitest"
import { MockAppointmentRepository } from "../repositories/appointmentMock.repository"
import { AppointmentService } from "./appointment.service"

describe("appointment.service", () => {
  let repository: MockAppointmentRepository
  let service: AppointmentService

  beforeEach(() => {
    repository = new MockAppointmentRepository(true)
    service = new AppointmentService(repository)
  })

  describe("listAppointments & Filtros", () => {
    it("retorna lista paginada com contagens de chips e estrutura esperada", async () => {
      const response = await service.listAppointments({ page: 1, limit: 20 })

      expect(response.data).toBeInstanceOf(Array)
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

      // Verifica formato das linhas
      const first = response.data[0]
      expect(first).toHaveProperty("protocol")
      expect(first.protocol).toHaveLength(8)
      expect(first).toHaveProperty("cpf_masked")
      expect(first.cpf_masked).toMatch(/^\*{3}\.[0-9]{3}\.[0-9]{3}-\*{2}$/)
      // Garante LGPD: não possui telefone na resposta
      expect(first).not.toHaveProperty("phone")
      expect(first).not.toHaveProperty("phone_encrypted")
    })

    it("busca por nome ignorando maiúsculas e acentos", async () => {
      const response = await service.listAppointments({ search: "maria" })
      expect(response.data.some((a) => a.name === "Maria Silva")).toBe(true)

      const responseAccented = await service.listAppointments({ search: "patricia" })
      expect(responseAccented.data.some((a) => a.name === "Patrícia Souza")).toBe(true)
    })

    it("busca por protocolo pelo início", async () => {
      const response = await service.listAppointments({ search: "a1b2c3d4" })
      expect(response.data).toHaveLength(1)
      expect(response.data[0].name).toBe("Maria Silva")
    })

    it("busca por CPF de 11 dígitos compara por hash e preserva sigilo", async () => {
      // CPF da Maria Silva: 11144477735
      const response = await service.listAppointments({ search: "11144477735" })
      expect(response.data).toHaveLength(1)
      expect(response.data[0].name).toBe("Maria Silva")
      expect(response.data[0].cpf_masked).toBe("***.444.777-**")
    })

    it("filtra por status PENDING e CONFIRMED", async () => {
      const pendingRes = await service.listAppointments({ status: "PENDING" })
      expect(pendingRes.data.every((a) => a.status === "PENDING")).toBe(true)

      const confirmedRes = await service.listAppointments({ status: "CONFIRMED" })
      expect(confirmedRes.data.every((a) => a.status === "CONFIRMED")).toBe(true)
    })

    it("filtra por waiting_record (confirmados com horário já passado)", async () => {
      const response = await service.listAppointments({ status: "waiting_record" })
      expect(response.data.every((a) => a.status === "CONFIRMED" && a.waiting_record)).toBe(true)
    })

    it("filtra por responsável: unassigned e específico", async () => {
      const unassignedRes = await service.listAppointments({ responsible: "unassigned" })
      expect(unassignedRes.data.every((a) => a.assigned_user_id === null)).toBe(true)

      const assignedRes = await service.listAppointments({ responsible: "2" })
      expect(assignedRes.data.every((a) => a.assigned_user_id === "2")).toBe(true)
    })

    it("ordena por nome crescente e decrescente", async () => {
      const ascRes = await service.listAppointments({ sortBy: "name", sortOrder: "asc" })
      const names = ascRes.data.map((a) => a.name)
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b))
      expect(names).toEqual(sortedNames)

      const descRes = await service.listAppointments({ sortBy: "name", sortOrder: "desc" })
      expect(descRes.data[0].name).toBe(sortedNames[sortedNames.length - 1])
    })
  })

  describe("getPendingCount", () => {
    it("retorna o número correto de agendamentos pendentes", async () => {
      const result = await service.getPendingCount()
      expect(result.count).toBe(repository.appointments.filter((a) => a.status === "PENDING").length)
    })
  })

  describe("getAppointmentDetail", () => {
    it("retorna detalhes completos com eventos, notas e timeline da sessão", async () => {
      const detail = await service.getAppointmentDetail(1)
      expect(detail.id).toBe("1")
      expect(detail.protocol).toBe("a1b2c3d4")
      expect(detail.name).toBe("Maria Silva")
      expect(detail.category_name).toBe("Cobrança")
      expect(detail.documents_sent).toHaveProperty("group")
      expect(detail.documents_sent).toHaveProperty("question")
      expect(detail.events).toBeInstanceOf(Array)
      expect(detail.timeline).toBeInstanceOf(Array)
      expect(detail.timeline.length).toBeGreaterThan(0)
    })

    it("detecta quando a lista de documentos enviada difere da configuração atual", async () => {
      // ID 9 foi configurado com documentos desatualizados
      const detail = await service.getAppointmentDetail(9)
      expect(detail.is_documents_config_different).toBe(true)

      // ID 1 coincide com a configuração atual
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

      // Evento CLAIMED foi registrado no histórico
      const claimedEvent = result.events.find((e) => e.type === "CLAIMED")
      expect(claimedEvent).toBeDefined()
      expect(claimedEvent?.actor_user_id).toBe("42")
    })

    it("recusa assumir agendamento que não esteja Pendente", async () => {
      // ID 2 já está CONFIRMED
      await expect(service.claimAppointment(2, 42)).rejects.toThrow(
        "Apenas agendamentos com status Pendente podem ser assumidos",
      )
    })
  })

  describe("markAttended (Marcar como atendido)", () => {
    it("marca como atendido com sucesso quando a data é hoje ou no passado", async () => {
      // ID 7 é hoje de manhã
      const result = await service.markAttended(7, 42)
      expect(result.status).toBe("ATTENDED")
      expect(result.assigned_user_id).toBe("42")

      const attendedEvent = result.events.find((e) => e.type === "ATTENDED")
      expect(attendedEvent).toBeDefined()
    })

    it("num pendente, assume automaticamente para quem clicou registrando os dois eventos", async () => {
      // ID 7 é PENDING
      const result = await service.markAttended(7, 42)
      expect(result.assigned_user_id).toBe("42")

      const claimedEvent = result.events.find((e) => e.type === "CLAIMED")
      const attendedEvent = result.events.find((e) => e.type === "ATTENDED")
      expect(claimedEvent).toBeDefined()
      expect(attendedEvent).toBeDefined()
    })

    it("recusa marcar como atendido se for para data futura", async () => {
      // ID 1 é amanhã
      await expect(service.markAttended(1, 42)).rejects.toThrow(
        "Disponível a partir do dia do atendimento",
      )
    })

    it("recusa se agendamento já foi atendido, cancelado ou não compareceu", async () => {
      // ID 4 já é ATTENDED
      await expect(service.markAttended(4, 42)).rejects.toThrow(
        "Agendamento já foi marcado como atendido",
      )
      // ID 6 é CANCELED
      await expect(service.markAttended(6, 42)).rejects.toThrow(
        "Não é possível registrar atendimento para um agendamento cancelado",
      )
    })
  })

  describe("markNoShow (Marcar como não compareceu)", () => {
    it("marca como não compareceu com sucesso quando o horário já passou", async () => {
      // ID 7 é hoje às 08:00 (já passou)
      const now = new Date()
      now.setHours(12, 0, 0, 0)
      const result = await service.markNoShow(7, 42, now)
      expect(result.status).toBe("NO_SHOW")

      const noShowEvent = result.events.find((e) => e.type === "NO_SHOW")
      expect(noShowEvent).toBeDefined()
    })

    it("num pendente, assume automaticamente para quem clicou", async () => {
      const now = new Date()
      now.setHours(12, 0, 0, 0)
      const result = await service.markNoShow(7, 42, now)
      expect(result.assigned_user_id).toBe("42")

      const claimedEvent = result.events.find((e) => e.type === "CLAIMED")
      const noShowEvent = result.events.find((e) => e.type === "NO_SHOW")
      expect(claimedEvent).toBeDefined()
      expect(noShowEvent).toBeDefined()
    })

    it("recusa marcar como não compareceu se o horário ainda não passou", async () => {
      // ID 8 é hoje às 23:59 (futuro)
      const now = new Date()
      now.setHours(10, 0, 0, 0)
      await expect(service.markNoShow(8, 42, now)).rejects.toThrow(
        "Disponível apenas após o horário do agendamento",
      )
    })
  })
})
