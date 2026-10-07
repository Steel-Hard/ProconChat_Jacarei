/**
 * Utilitários de data e período para regras de agendamento (fuso de Jacareí/SP UTC-3)
 */

export function parseDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

/**
 * Retorna string YYYY-MM-DD no horário de Brasília (UTC-3 / America/Sao_Paulo),
 * independente do fuso horário configurado no servidor/SO (ex: runners UTC no CI).
 */
export function toLocalDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/**
 * Adiciona ou subtrai dias de uma data em formato YYYY-MM-DD no fuso de São Paulo
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00-03:00`)
  d.setDate(d.getDate() + days)
  return toLocalDateString(d)
}

/**
 * Retorna true se a data do agendamento (YYYY-MM-DD) é hoje ou anterior a hoje (para "Marcar como atendido")
 */
export function isDateOnOrBeforeToday(appointmentDate: Date, now: Date = new Date()): boolean {
  const apptDateStr = toLocalDateString(appointmentDate)
  const todayStr = toLocalDateString(now)
  return apptDateStr <= todayStr
}

/**
 * Retorna true se o horário do agendamento já passou (para "Marcar como não compareceu")
 */
export function isDatetimePast(appointmentDatetime: Date, now: Date = new Date()): boolean {
  return appointmentDatetime.getTime() <= now.getTime()
}

/**
 * Retorna início e fim do dia atual (UTC-3) em instantes Date
 */
export function getTodayBounds(now: Date = new Date()): { start: Date; end: Date } {
  const dateStr = toLocalDateString(now)
  const start = new Date(`${dateStr}T00:00:00-03:00`)
  const end = new Date(`${dateStr}T23:59:59.999-03:00`)
  return { start, end }
}

/**
 * Retorna início e fim da semana corrente (de domingo a sábado) no horário local de São Paulo
 */
export function getThisWeekBounds(now: Date = new Date()): { start: Date; end: Date } {
  const dateStr = toLocalDateString(now)
  const baseDate = new Date(`${dateStr}T12:00:00-03:00`)
  const dayOfWeek = baseDate.getDay() // 0 = Domingo

  const startDate = new Date(baseDate.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
  const endDate = new Date(baseDate.getTime() + (6 - dayOfWeek) * 24 * 60 * 60 * 1000)

  const startStr = toLocalDateString(startDate)
  const endStr = toLocalDateString(endDate)

  return {
    start: new Date(`${startStr}T00:00:00-03:00`),
    end: new Date(`${endStr}T23:59:59.999-03:00`),
  }
}
