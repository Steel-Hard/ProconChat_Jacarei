import getPool from "../db/connection"

export type SessionStep =
    | "AWAITING_CATEGORY"
    | "AWAITING_QUESTION"
    | "AWAITING_ANSWER"
    | "AWAITING_RESOLVED"
    | "AWAITING_SCHEDULE_OFFER"
    | "AWAITING_ATTENDEE"
    | "AWAITING_HOLDER_NAME"
    | "AWAITING_HOLDER_CPF"
    | "AWAITING_SLOT"
    | "AWAITING_RETURN_CHOICE"
    | "AWAITING_CANCEL_CONFIRMATION"
    | "FINISHED"

export type SessionOutcome =
    | "IN_PROGRESS"
    | "RESOLVED"
    | "SCHEDULED"
    | "OUT_OF_SCOPE"
    | "NO_SLOT"
    | "DECLINED"
    | "MANAGED_APPOINTMENT"
    | "ABANDONED"

export interface SessionDraft {
    by_representative?: boolean
    holder_name?: string
    cpf_hash?: string
    cpf_masked?: string
    target_appointment_id?: number | string
}

export interface ActiveSession {
    id: string
    created: boolean
    currentStep: SessionStep
    currentCategoryId: string | null
    currentQuestionId: string | null
    listPage: number
    draft?: SessionDraft | null
}

export interface NavigationState {
    currentStep: SessionStep
    currentCategoryId?: string | null
    currentQuestionId?: string | null
    listPage?: number
    draft?: SessionDraft | null
}

export interface SessionRepository {
    findOrCreateActive(phoneHash: string): Promise<ActiveSession>
    updateNavigationState(sessionId: string, state: NavigationState): Promise<void>
    finish(sessionId: string, outcome?: SessionOutcome): Promise<void>
}

export const sessionRepository: SessionRepository = {
    async findOrCreateActive(phoneHash: string): Promise<ActiveSession> {
        const pool = getPool()

        // Regra do Timeout (Decisão 008): 30 minutos sem interação vira Abandonada
        await pool.query(
            `UPDATE Sessions
             SET status = 'ABANDONED',
                 outcome = 'ABANDONED',
                 abandoned_at_step = current_step,
                 draft = NULL,
                 ended_at = now()
             WHERE phone_hash = $1
               AND status = 'IN_PROGRESS'
               AND last_interaction_at < now() - INTERVAL '30 minutes'`,
            [phoneHash],
        )

        const inserted = await pool.query<{
            id: string
            current_step: SessionStep
            current_category_id: string | null
            current_question_id: string | null
            list_page: number
            draft: SessionDraft | null
        }>(
            `INSERT INTO Sessions (phone_hash)
             VALUES ($1)
             ON CONFLICT (phone_hash) WHERE status = 'IN_PROGRESS' DO NOTHING
             RETURNING id, current_step, current_category_id, current_question_id, list_page, draft`,
            [phoneHash],
        )

        const created = inserted.rows[0]
        if (created) {
            return {
                id: created.id,
                created: true,
                currentStep: created.current_step,
                currentCategoryId: created.current_category_id,
                currentQuestionId: created.current_question_id,
                listPage: created.list_page,
                draft: created.draft,
            }
        }

        const existing = await pool.query<{
            id: string
            current_step: SessionStep
            current_category_id: string | null
            current_question_id: string | null
            list_page: number
            draft: SessionDraft | null
        }>(
            `UPDATE Sessions
             SET last_interaction_at = now()
             WHERE phone_hash = $1 AND status = 'IN_PROGRESS'
             RETURNING id, current_step, current_category_id, current_question_id, list_page, draft`,
            [phoneHash],
        )

        const session = existing.rows[0]
        if (!session) {
            throw new Error("Could not find or create conversation session")
        }

        return {
            id: session.id,
            created: false,
            currentStep: session.current_step,
            currentCategoryId: session.current_category_id,
            currentQuestionId: session.current_question_id,
            listPage: session.list_page,
            draft: session.draft,
        }
    },

    async updateNavigationState(sessionId: string, state: NavigationState): Promise<void> {
        const pool = getPool()

        const hasDraftUpdate = state.draft !== undefined
        const draftJson = state.draft ? JSON.stringify(state.draft) : null

        const result = await pool.query(
            `UPDATE Sessions
             SET current_step = $1,
                 current_category_id = COALESCE($2, current_category_id),
                 current_question_id = COALESCE($3, current_question_id),
                 list_page = COALESCE($4, list_page),
                 draft = CASE WHEN $5::boolean THEN $6::jsonb ELSE draft END,
                 last_interaction_at = now()
             WHERE id = $7
               AND status = 'IN_PROGRESS'`,
            [
                state.currentStep,
                state.currentCategoryId ?? null,
                state.currentQuestionId ?? null,
                state.listPage ?? null,
                hasDraftUpdate,
                draftJson,
                sessionId,
            ],
        )

        if (result.rowCount !== 1) {
            throw new Error("Conversation session was changed or finished")
        }
    },

    async finish(sessionId: string, outcome: SessionOutcome = "RESOLVED"): Promise<void> {
        const pool = getPool()
        await pool.query(
            `UPDATE Sessions
             SET status = 'FINISHED',
                 outcome = $2,
                 ended_at = now(),
                 last_interaction_at = now(),
                 current_step = 'FINISHED',
                 draft = NULL
             WHERE id = $1`,
            [sessionId, outcome],
        )
    },
}
