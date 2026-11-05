export interface ConfirmationPreviewInput {
    protocol?: string
    quando?: string
    unitAddress?: string
    unitAddressComplement?: string | null
    byRepresentative: boolean
    groupDocuments: string[]
    questionDocuments: string[]
    reminderEnabled?: boolean
    reminderHours?: number
    titulo?: string
}

export function formatConfirmationPreview(input: ConfirmationPreviewInput): string {
    const protocol = input.protocol ?? "A3F9C21B"
    const quando = input.quando ?? "Ter, 10/11 às 14:00"
    const unitAddress =
        input.unitAddress ??
        "Avenida Capitão Joaquim Pinheiro do Prado, 222 - Centro, Jacareí - SP, CEP 12327-160"
    const unitAddressComplement = input.unitAddressComplement ?? null
    const reminderEnabled = input.reminderEnabled ?? false
    const reminderHours = input.reminderHours ?? 24

    const linhas: string[] = [
        input.titulo ?? "Agendamento realizado",
        `Protocolo: ${protocol}`,
        `Data e hora: ${quando}`
    ]

    const endereco =
        unitAddress.trim() +
        (unitAddressComplement?.trim() ? ` (${unitAddressComplement.trim()})` : "")
    linhas.push(`Endereço: ${endereco}`)

    if (input.groupDocuments.length > 0) {
        linhas.push("")
        const tituloGrupo = input.byRepresentative
            ? "A pessoa que comparecer em seu nome deve levar:"
            : "Leve ao atendimento:"
        linhas.push(tituloGrupo)
        for (const doc of input.groupDocuments) {
            linhas.push(`• ${doc}`)
        }
    }

    if (input.questionDocuments.length > 0) {
        linhas.push("")
        linhas.push("Documentos úteis para esta dúvida:")
        for (const doc of input.questionDocuments) {
            linhas.push(`• ${doc}`)
        }
    }

    linhas.push("")
    const horasTexto = reminderHours === 1 ? "1 hora" : `${reminderHours} horas`
    const avisoTexto = reminderEnabled
        ? `Você receberá neste número avisos sobre este agendamento, como um lembrete ${horasTexto} antes do atendimento e o aviso em caso de cancelamento.`
        : "Você receberá neste número avisos sobre este agendamento, como o aviso em caso de cancelamento."
    linhas.push(avisoTexto)

    return linhas.join("\n")
}

export default formatConfirmationPreview
