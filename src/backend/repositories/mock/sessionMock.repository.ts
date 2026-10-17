import type { SessionClosing } from "../../types/conversationEvent.types"
import type { ActiveSession, NavigationState, SessionRepository } from "../session.repository"

interface StoredSession {
    phoneHash: string
    finished: boolean
    state: Omit<ActiveSession, "created">
}

export interface InMemorySessionRepositoryOptions {
    ids?: string[]
}

function cloneState(state: Omit<ActiveSession, "created">): Omit<ActiveSession, "created"> {
    return {
        ...state,
        ...(state.draft ? { draft: { ...state.draft } } : {}),
    }
}

export class InMemorySessionRepository implements SessionRepository {
    private readonly sessions = new Map<string, StoredSession>()

    private readonly ids: string[]

    private sequence = 0

    constructor({ ids = [] }: InMemorySessionRepositoryOptions = {}) {
        this.ids = [...ids]
    }

    async findOrCreateActive(phoneHash: string): Promise<ActiveSession> {
        const existing = [...this.sessions.values()].find(
            (session) => session.phoneHash === phoneHash && !session.finished,
        )

        if (existing) {
            return { ...cloneState(existing.state), created: false }
        }

        this.sequence += 1
        const id = this.ids.shift() ?? String(this.sequence)
        const stored: StoredSession = {
            phoneHash,
            finished: false,
            state: {
                id,
                currentStep: "AWAITING_CATEGORY",
                currentCategoryId: null,
                currentQuestionId: null,
                listPage: 1,
                draft: null,
            },
        }
        this.sessions.set(id, stored)

        return {
            id,
            created: true,
            currentStep: stored.state.currentStep,
            currentCategoryId: stored.state.currentCategoryId,
            currentQuestionId: stored.state.currentQuestionId,
            listPage: stored.state.listPage,
            draft: stored.state.draft,
        }
    }

    async updateNavigationState(sessionId: string, state: NavigationState): Promise<void> {
        const stored = this.activeSession(sessionId)

        stored.state = {
            ...stored.state,
            currentStep: state.currentStep,
            currentCategoryId:
                state.currentCategoryId !== undefined ? state.currentCategoryId : stored.state.currentCategoryId,
            currentQuestionId:
                state.currentQuestionId !== undefined
                    ? (state.currentQuestionId ?? null)
                    : stored.state.currentQuestionId,
            listPage: state.listPage ?? 1,
            draft: state.draft !== undefined ? (state.draft ? { ...state.draft } : null) : stored.state.draft,
        }
    }

    async touch(sessionId: string): Promise<void> {
        this.activeSession(sessionId)
    }

    async finish(sessionId: string, _closing: SessionClosing): Promise<void> {
        const stored = this.activeSession(sessionId)
        stored.finished = true
        stored.state = { ...stored.state, draft: null }
    }

    async sweepAbandonedSessions(): Promise<number> {
        return 0
    }

    snapshot(sessionId: string): Omit<ActiveSession, "created"> | undefined {
        const stored = this.sessions.get(sessionId)
        return stored ? cloneState(stored.state) : undefined
    }

    private activeSession(sessionId: string): StoredSession {
        const stored = this.sessions.get(sessionId)
        if (!stored || stored.finished) {
            throw new Error("Conversation session was changed or finished")
        }
        return stored
    }
}
