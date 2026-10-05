import { IScheduleRepository } from "../repositories/schedule.repository.interface"
import {
  AvailableSlot,
  BlockedDate,
  BookAppointmentInput,
  BookAppointmentResult,
  ScheduleRange,
  ScheduleSettings,
} from "../types/schedule.types"

const WEEKDAYS_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
]

export function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days, 12, 0, 0))
  return dt.toISOString().slice(0, 10)
}

export function getDowFromDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0))
  return dt.getUTCDay()
}

export function getLocalParts(d: Date, timeZone = "America/Sao_Paulo"): {
  dateStr: string
  timeStr: string
  hour: number
  minute: number
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d)

  let year = 0
  let month = 0
  let day = 0
  let hour = 0
  let minute = 0
  for (const part of parts) {
    if (part.type === "year") year = Number(part.value)
    if (part.type === "month") month = Number(part.value)
    if (part.type === "day") day = Number(part.value)
    if (part.type === "hour") hour = Number(part.value) % 24
    if (part.type === "minute") minute = Number(part.value)
  }

  const mm = String(month).padStart(2, "0")
  const dd = String(day).padStart(2, "0")
  const hh = String(hour).padStart(2, "0")
  const min = String(minute).padStart(2, "0")

  return {
    dateStr: `${year}-${mm}-${dd}`,
    timeStr: `${hh}:${min}`,
    hour,
    minute,
  }
}

export class ScheduleService {
  constructor(private readonly repository: IScheduleRepository) {}

  /**
   * Determina se uma data é considerada dia com atendimento configurado e não bloqueado.
   */
  private isBusinessDay(
    dateStr: string,
    ranges: ScheduleRange[],
    blockedDates: BlockedDate[],
    slotMinutes: number,
  ): boolean {
    const dow = getDowFromDateStr(dateStr)
    const rangesForDay = ranges.filter((r) => r.weekday === dow)
    if (rangesForDay.length === 0) {
      return false
    }

    const fullDayBlocked = blockedDates.some(
      (b) => b.date === dateStr && (!b.start_time || !b.end_time),
    )
    if (fullDayBlocked) {
      return false
    }

    const partialBlocks = blockedDates.filter(
      (b) => b.date === dateStr && b.start_time && b.end_time,
    )

    // Verifica se há pelo menos um slot possível que não esteja bloqueado
    for (const range of rangesForDay) {
      const startMin = toMinutes(range.start_time)
      const endMin = toMinutes(range.end_time)

      for (let t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
        const slotStart = t
        const slotEnd = t + slotMinutes
        const isBlocked = partialBlocks.some((p) => {
          const pStart = toMinutes(p.start_time!)
          const pEnd = toMinutes(p.end_time!)
          return slotStart < pEnd && slotEnd > pStart
        })

        if (!isBlocked) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Calcula todos os horários livres dentro da janela de agendamento.
   */
  async getAvailableSlots(now = new Date()): Promise<AvailableSlot[]> {
    const settings = await this.repository.getSettings()
    if (!settings) {
      return []
    }

    const { dateStr: todayStr, timeStr: nowTimeStr } = getLocalParts(now)
    const nowMinutes = toMinutes(nowTimeStr)

    const ranges = await this.repository.getRanges()
    if (ranges.length === 0) {
      return []
    }

    const maxDateStr = addDaysToDateStr(todayStr, settings.window_days + 15)
    const blockedDates = await this.repository.getBlockedDates(
      todayStr,
      maxDateStr,
    )

    // Cálculo da antecedência mínima (dias com atendimento e não bloqueados)
    let startDateStr = todayStr
    if (settings.min_notice_days > 0) {
      let n = 0
      let d = todayStr
      while (n < settings.min_notice_days) {
        d = addDaysToDateStr(d, 1)
        if (
          this.isBusinessDay(
            d,
            ranges,
            blockedDates,
            settings.slot_minutes,
          )
        ) {
          n++
        }
      }
      startDateStr = d
    }

    const endDateStr = addDaysToDateStr(todayStr, settings.window_days)

    // Gera os slots candidatos no intervalo [startDateStr, endDateStr]
    interface CandidateSlot {
      datetime: Date
      dateStr: string
      timeStr: string
      formatted: string
    }

    const candidateSlots: CandidateSlot[] = []
    let curr = startDateStr

    while (curr <= endDateStr) {
      const dow = getDowFromDateStr(curr)
      const rangesForDay = ranges
        .filter((r) => r.weekday === dow)
        .sort((a, b) => a.slot_index - b.slot_index)

      const fullDayBlocked = blockedDates.some(
        (b) => b.date === curr && (!b.start_time || !b.end_time),
      )

      if (!fullDayBlocked && rangesForDay.length > 0) {
        const partialBlocks = blockedDates.filter(
          (b) => b.date === curr && b.start_time && b.end_time,
        )

        for (const range of rangesForDay) {
          const startMin = toMinutes(range.start_time)
          const endMin = toMinutes(range.end_time)

          for (
            let t = startMin;
            t + settings.slot_minutes <= endMin;
            t += settings.slot_minutes
          ) {
            // Se for hoje, o horário não pode já ter passado
            if (curr === todayStr && t <= nowMinutes) {
              continue
            }

            const slotStart = t
            const slotEnd = t + settings.slot_minutes

            const isBlocked = partialBlocks.some((p) => {
              const pStart = toMinutes(p.start_time!)
              const pEnd = toMinutes(p.end_time!)
              return slotStart < pEnd && slotEnd > pStart
            })

            if (!isBlocked) {
              const slotTimeStr = fromMinutes(t)
              const [_y, m, d] = curr.split("-")
              const weekdayName = WEEKDAYS_PT[dow] ?? ""
              const formatted = `${weekdayName}, ${d}/${m} às ${slotTimeStr}`
              const datetime = new Date(`${curr}T${slotTimeStr}:00-03:00`)

              candidateSlots.push({
                datetime,
                dateStr: curr,
                timeStr: slotTimeStr,
                formatted,
              })
            }
          }
        }
      }

      curr = addDaysToDateStr(curr, 1)
    }

    if (candidateSlots.length === 0) {
      return []
    }

    // Busca contagem de agendamentos ativos por slot
    const firstDatetime = candidateSlots[0]!.datetime
    const lastDatetime = candidateSlots[candidateSlots.length - 1]!.datetime

    const activeCounts = await this.repository.countActiveAppointmentsPerSlot(
      firstDatetime,
      lastDatetime,
    )

    const availableSlots: AvailableSlot[] = []

    for (const slot of candidateSlots) {
      const active = activeCounts.get(slot.datetime.toISOString()) ?? 0
      const remainingSeats = settings.seats_per_slot - active

      if (remainingSeats > 0) {
        availableSlots.push({
          datetime: slot.datetime,
          dateStr: slot.dateStr,
          timeStr: slot.timeStr,
          formatted: slot.formatted,
          remainingSeats,
        })
      }
    }

    return availableSlots
  }

  /**
   * Cria o agendamento presencial.
   */
  async bookSlot(input: BookAppointmentInput): Promise<BookAppointmentResult> {
    return this.repository.bookAppointment(input)
  }

  async getAttendanceDocuments(byRepresentative: boolean): Promise<string[]> {
    const group = byRepresentative ? "REPRESENTATIVE" : "HOLDER"
    return this.repository.getAttendanceDocuments(group)
  }

  async getQuestionDocuments(questionId: number): Promise<string[]> {
    return this.repository.getQuestionDocuments(questionId)
  }

  async getSettings(): Promise<ScheduleSettings | null> {
    return this.repository.getSettings()
  }
}
