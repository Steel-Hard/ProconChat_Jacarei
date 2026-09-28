import { InitialConfigSeed, ScheduleRangeSeed } from "./types"

const weekdays = [1, 2, 3, 4, 5]

const scheduleRanges: ScheduleRangeSeed[] = weekdays.flatMap((weekday) => [
    { weekday, slotIndex: 1, startTime: "08:00", endTime: "12:00" },
    { weekday, slotIndex: 2, startTime: "13:00", endTime: "17:00" },
])

const configuracaoInicial: InitialConfigSeed = {
    slotMinutes: 30,
    seatsPerSlot: 2,
    windowDays: 30,
    minNoticeDays: 1,
    waitAlertDays: 7,
    unitAddress: "Avenida Capitão Joaquim Pinheiro do Prado, 222 - Centro, Jacareí - SP, CEP 12327-160",
    unitAddressComplement: null,
    reminderEnabled: false,
    reminderHours: 24,
    scheduleRanges,
    attendanceDocuments: {
        holder: [
            "RG ou outro documento oficial com foto",
            "CPF",
            "Comprovante de endereço",
            "Comprovante da reclamação (nota fiscal, contrato, fatura ou protocolo)",
        ],
        representative: [
            "RG e CPF do titular (cópia)",
            "RG ou outro documento oficial com foto do representante",
            "Autorização assinada pelo titular ou procuração",
            "Comprovante da reclamação (nota fiscal, contrato, fatura ou protocolo)",
        ],
    },
}

export default configuracaoInicial
