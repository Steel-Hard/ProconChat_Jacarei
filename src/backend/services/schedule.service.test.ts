import { beforeEach, describe, expect, it, vi } from "vitest"
import { IScheduleRepository } from "../repositories/schedule.repository.interface"
import {
  BlockedDate,
  ScheduleRange,
  ScheduleSettings,
} from "../types/schedule.types"
import { ScheduleService } from "./schedule.service"

describe("ScheduleService", () => {
  const defaultSettings: ScheduleSettings = {
    id: 1,
    slot_minutes: 30,
    seats_per_slot: 2,
    window_days: 7,
    min_notice_days: 1,
    wait_alert_days: 7,
    unit_address: "Rua do Procon, 100",
    unit_address_complement: "Sala 2",
    reminder_enabled: true,
    reminder_hours: 24,
  }

  // Segunda a sexta: 08:00 às 10:00 (4 slots de 30min por dia: 08:00, 08:30, 09:00, 09:30)
  const defaultRanges: ScheduleRange[] = [1, 2, 3, 4, 5].map((weekday) => ({
    id: weekday,
    weekday,
    slot_index: 1,
    start_time: "08:00:00",
    end_time: "10:00:00",
  }))

  let repoMock: IScheduleRepository
  let service: ScheduleService

  beforeEach(() => {
    repoMock = {
      getSettings: vi.fn().mockResolvedValue(defaultSettings),
      getRanges: vi.fn().mockResolvedValue(defaultRanges),
      getBlockedDates: vi.fn().mockResolvedValue([]),
      getAttendanceDocuments: vi.fn().mockResolvedValue(["RG"]),
      getQuestionDocuments: vi.fn().mockResolvedValue(["Contrato"]),
      countActiveAppointmentsPerSlot: vi.fn().mockResolvedValue(new Map()),
      bookAppointment: vi.fn(),
    }
    service = new ScheduleService(repoMock)
  })

  it("deve calcular horários livres respeitando a antecedência mínima de 1 dia útil", async () => {
    // Segunda-feira às 09:00
    const now = new Date("2026-10-05T09:00:00-03:00")
    const slots = await service.getAvailableSlots(now)

    expect(slots.length).toBeGreaterThan(0)
    // Como antecedência mínima é 1 dia útil, não deve ter horários na segunda 05/10
    expect(slots.some((s) => s.dateStr === "2026-10-05")).toBe(false)
    // O primeiro dia deve ser terça-feira 06/10
    expect(slots[0]?.dateStr).toBe("2026-10-06")
    expect(slots[0]?.timeStr).toBe("08:00")
    expect(slots[0]?.formatted).toContain("Terça-feira, 06/10 às 08:00")
  })

  it("deve oferecer horários no mesmo dia se min_notice_days for 0 e horário for futuro", async () => {
    vi.mocked(repoMock.getSettings).mockResolvedValueOnce({
      ...defaultSettings,
      min_notice_days: 0,
    })

    // Segunda-feira 05/10 às 08:15
    const now = new Date("2026-10-05T08:15:00-03:00")
    const slots = await service.getAvailableSlots(now)

    // O horário 08:00 já passou, então deve começar em 08:30
    const todaySlots = slots.filter((s) => s.dateStr === "2026-10-05")
    expect(todaySlots.length).toBeGreaterThan(0)
    expect(todaySlots[0]?.timeStr).toBe("08:30")
  })

  it("deve ignorar dias inteiros bloqueados em BlockedDates", async () => {
    const blocked: BlockedDate[] = [
      {
        id: 1,
        date: "2026-10-06",
        start_time: null,
        end_time: null,
        description: "Feriado Municipal",
      },
    ]
    vi.mocked(repoMock.getBlockedDates).mockResolvedValueOnce(blocked)

    const now = new Date("2026-10-05T09:00:00-03:00")
    const slots = await service.getAvailableSlots(now)

    // 06/10 é feriado, então deve pular para 07/10
    expect(slots.some((s) => s.dateStr === "2026-10-06")).toBe(false)
    expect(slots[0]?.dateStr).toBe("2026-10-07")
  })

  it("deve filtrar slots que colidem com bloqueios parciais", async () => {
    const blocked: BlockedDate[] = [
      {
        id: 2,
        date: "2026-10-06",
        start_time: "08:30:00",
        end_time: "09:30:00",
        description: "Manutenção",
      },
    ]
    vi.mocked(repoMock.getBlockedDates).mockResolvedValueOnce(blocked)

    const now = new Date("2026-10-05T09:00:00-03:00")
    const slots = await service.getAvailableSlots(now)

    const tuesdaySlots = slots.filter((s) => s.dateStr === "2026-10-06")
    // Deve conter 08:00 e 09:30, mas não 08:30 nem 09:00
    const times = tuesdaySlots.map((s) => s.timeStr)
    expect(times).toContain("08:00")
    expect(times).not.toContain("08:30")
    expect(times).not.toContain("09:00")
    expect(times).toContain("09:30")
  })

  it("deve excluir slots lotados e diminuir vagas restantes de slots parcialmente ocupados", async () => {
    const activeCounts = new Map<string, number>()
    // 06/10 08:00 tem 2 agendamentos ativos (lotado)
    activeCounts.set(new Date("2026-10-06T08:00:00-03:00").toISOString(), 2)
    // 06/10 08:30 tem 1 agendamento ativo (resta 1 vaga)
    activeCounts.set(new Date("2026-10-06T08:30:00-03:00").toISOString(), 1)

    vi.mocked(repoMock.countActiveAppointmentsPerSlot).mockResolvedValueOnce(
      activeCounts,
    )

    const now = new Date("2026-10-05T09:00:00-03:00")
    const slots = await service.getAvailableSlots(now)

    const tuesdaySlots = slots.filter((s) => s.dateStr === "2026-10-06")
    expect(tuesdaySlots.some((s) => s.timeStr === "08:00")).toBe(false)

    const slot0830 = tuesdaySlots.find((s) => s.timeStr === "08:30")
    expect(slot0830).toBeDefined()
    expect(slot0830?.remainingSeats).toBe(1)
  })

  it("deve retornar array vazio se ScheduleSettings não estiver configurado", async () => {
    vi.mocked(repoMock.getSettings).mockResolvedValueOnce(null)
    const slots = await service.getAvailableSlots()
    expect(slots).toEqual([])
  })
})
