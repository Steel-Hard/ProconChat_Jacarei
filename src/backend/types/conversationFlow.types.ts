import type { SessionStep } from "../repositories/session.repository"
import type { OutgoingMessage } from "./message.types"
import type { Categoria, Pergunta, RespostaFinalOutput } from "./motorDecisao.types"
import type { AvailableSlot, BookAppointmentInput, BookAppointmentResult } from "./schedule.types"

export interface ConversationFlowInput {
    phone: string
    text?: string
    optionId?: string
}

export interface ConversationFlowReply {
    text: string
    step: SessionStep
    messages?: OutgoingMessage[]
}

export interface ConversationFlowResult {
    sessionId: string
    newSession: boolean
    reply: ConversationFlowReply
}

export interface PausedConversationFlowResult {
    sessionId: null
    newSession: false
    paused: true
    reply: {
        text: string
        step: null
        messages: OutgoingMessage[]
    }
}

export type ConversationFlowResponse =
    | ConversationFlowResult
    | PausedConversationFlowResult

export interface MotorDecisao {
    iniciarSessao(): Promise<Categoria[]>
    escolherCategoria(categoriaId: number): Promise<Pergunta[]>
    processarPergunta(perguntaId: number): Promise<RespostaFinalOutput>
}

export interface ScheduleProvider {
    getAvailableSlots(now?: Date): Promise<AvailableSlot[]>
    bookSlot(input: BookAppointmentInput): Promise<BookAppointmentResult>
}
