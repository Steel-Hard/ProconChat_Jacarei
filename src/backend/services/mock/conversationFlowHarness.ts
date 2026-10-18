import { vi } from "vitest"
import type { SessionRepository } from "../../repositories/session.repository"
import type { ConversationEventService } from "../conversationEvent.service"
import { createConversationFlowService, MotorDecisao, ScheduleProvider } from "../conversationFlow.service"

type ConversationFlowDependencies = Parameters<typeof createConversationFlowService>[0]

export function createConversationFlowHarness() {
    const findOrCreateActive = vi.fn()
    const updateNavigationState = vi.fn()
    const touch = vi.fn()
    const finish = vi.fn()
    const sweepAbandonedSessions = vi.fn()
    const sessions: SessionRepository = {
        findOrCreateActive,
        updateNavigationState,
        touch,
        finish,
        sweepAbandonedSessions,
    }

    const recordEvent = vi.fn()
    const finishEvent = vi.fn()
    const listEvents = vi.fn()
    const events: ConversationEventService = {
        record: recordEvent,
        finish: finishEvent,
        listBySession: listEvents,
    }

    const logger = { error: vi.fn() }

    const iniciarSessao = vi.fn()
    const escolherCategoria = vi.fn()
    const processarPergunta = vi.fn()
    const motor: MotorDecisao = { iniciarSessao, escolherCategoria, processarPergunta }

    const getAvailableSlots = vi.fn()
    const bookSlot = vi.fn()
    const schedule: ScheduleProvider = { getAvailableSlots, bookSlot }

    const hashPhone = vi.fn((phone: string) => `hash-${phone}`)
    const isAutoReplyPaused = vi.fn<() => Promise<boolean>>(async () => false)

    function createFlow(overrides: Partial<ConversationFlowDependencies> = {}) {
        return createConversationFlowService({
            sessions,
            events,
            motor,
            schedule,
            hashPhone,
            logger,
            isAutoReplyPaused,
            ...overrides,
        })
    }

    return {
        findOrCreateActive,
        updateNavigationState,
        touch,
        finish,
        sweepAbandonedSessions,
        sessions,
        recordEvent,
        finishEvent,
        listEvents,
        events,
        logger,
        iniciarSessao,
        escolherCategoria,
        processarPergunta,
        motor,
        getAvailableSlots,
        bookSlot,
        schedule,
        hashPhone,
        isAutoReplyPaused,
        createFlow,
        processIncomingMessage: createFlow(),
    }
}
