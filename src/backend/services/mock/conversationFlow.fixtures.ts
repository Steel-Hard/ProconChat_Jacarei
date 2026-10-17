import { ActiveSession, SessionDraft } from "../../repositories/session.repository"
import { Categoria, Pergunta, RespostaFinalOutput } from "../../types/motorDecisao.types"
import { AvailableSlot, BookAppointmentResult } from "../../types/schedule.types"

export const categorias: Categoria[] = [
    { id: 1, title: "Contrato", short_title: "Contrato", active: true },
    { id: 2, title: "Garantias", short_title: "Garantias", active: true },
]

export const perguntas: Pergunta[] = [
    {
        id: 10,
        category_id: 1,
        question: "Posso cancelar o contrato?",
        short_title: "Cancelar contrato",
        short_description: "Cancelamento em 7 dias",
        legal_basis: "Art. 49 do CDC",
        answer: "Sim.",
        requires_in_person: false,
        out_of_scope: false,
        active: true,
    },
    {
        id: 11,
        category_id: 1,
        question: "Como denunciar crime cibernético?",
        short_title: "Crime cibernético",
        short_description: "Golpes na internet",
        legal_basis: null,
        answer: "Procure a delegacia.",
        requires_in_person: false,
        out_of_scope: true,
        active: true,
    },
    {
        id: 12,
        category_id: 1,
        question: "Quero abrir processo formal?",
        short_title: "Processo formal",
        short_description: "Abertura presencial de processo",
        legal_basis: null,
        answer: "Compareça ao PROCON.",
        requires_in_person: true,
        out_of_scope: false,
        active: true,
    },
]

export const respostaPadrao: RespostaFinalOutput = {
    categoria: "Contrato",
    pergunta: "Posso cancelar o contrato?",
    base_legal: "Art. 49 do CDC",
    resposta: "Sim, você pode cancelar em até 7 dias.",
    documentos_necessarios: ["Nota fiscal"],
    requer_presencial: false,
    fora_de_escopo: false,
}

export const respostaForaEscopo: RespostaFinalOutput = {
    categoria: "Contrato",
    pergunta: "Como denunciar crime cibernético?",
    base_legal: "",
    resposta: "Esta dúvida está fora do escopo.",
    documentos_necessarios: [],
    requer_presencial: false,
    fora_de_escopo: true,
}

export const respostaPresencial: RespostaFinalOutput = {
    categoria: "Contrato",
    pergunta: "Quero abrir processo formal?",
    base_legal: "",
    resposta: "Esta situação exige atendimento presencial.",
    documentos_necessarios: ["RG", "CPF"],
    requer_presencial: true,
    fora_de_escopo: false,
}

export const mockSlots: AvailableSlot[] = [
    {
        datetime: new Date("2026-10-06T08:00:00-03:00"),
        dateStr: "2026-10-06",
        timeStr: "08:00",
        formatted: "Terça-feira, 06/10 às 08:00",
        remainingSeats: 2,
    },
    {
        datetime: new Date("2026-10-06T08:30:00-03:00"),
        dateStr: "2026-10-06",
        timeStr: "08:30",
        formatted: "Terça-feira, 06/10 às 08:30",
        remainingSeats: 1,
    },
]

export const mockBookResult: BookAppointmentResult = {
    id: "1",
    appointmentCode: "a3f9c21b-0000-0000-0000-000000000000",
    protocol: "A3F9C21B",
    appointmentDatetime: new Date("2026-10-06T08:00:00-03:00"),
    unitAddress: "Rua do Procon, 100",
    unitAddressComplement: "Centro",
    documentsSent: {
        group: ["RG", "CPF"],
        question: ["Contrato"],
    },
    reminderEnabled: true,
    reminderHours: 24,
}

export function buildActiveSession(overrides: Partial<ActiveSession> = {}): ActiveSession {
    return {
        id: "s1",
        created: false,
        currentStep: "AWAITING_CATEGORY",
        currentCategoryId: null,
        listPage: 1,
        draft: null,
        ...overrides,
    }
}

export function buildBookingDraft(overrides: Partial<SessionDraft> = {}): SessionDraft {
    return {
        by_representative: false,
        holder_name: "Maria da Silva",
        cpf_hash: "a".repeat(64),
        cpf_masked: "***.982.247-**",
        ...overrides,
    }
}

export function slotOptionId(slot: AvailableSlot): string {
    return `slot_${slot.datetime.toISOString()}`
}
