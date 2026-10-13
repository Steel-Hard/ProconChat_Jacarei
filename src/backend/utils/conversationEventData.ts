import InternalServerError from "../errors/InternalServerError"
import type {
    AbandonedStep,
    ConversationEvent,
    ConversationEventData,
    ConversationEventRow,
    ConversationEventType,
    LlmStatus,
    RecordedConversationEvent,
    ScheduleOfferReason,
    SessionClosing,
    StoredConversationEventRow,
} from "../types/conversationEvent.types"

type FieldKind = "id" | "llm" | "reason" | "step" | "boolean" | "datetime"

type ColumnName = "categoryId" | "questionId" | "appointmentId"

interface FieldSpec {
    name: string
    kind: FieldKind
    column?: ColumnName
    dataKey?: string
}

const categoryField: FieldSpec = { name: "categoryId", kind: "id", column: "categoryId" }
const questionField: FieldSpec = { name: "questionId", kind: "id", column: "questionId" }
const appointmentField: FieldSpec = { name: "appointmentId", kind: "id", column: "appointmentId" }

const EVENT_FIELDS: Record<ConversationEventType, readonly FieldSpec[]> = {
    STARTED: [],
    CATEGORY_CHOSEN: [categoryField],
    QUESTION_CHOSEN: [categoryField, questionField],
    ANSWER_SENT: [categoryField, questionField, { name: "llm", kind: "llm", dataKey: "llm" }],
    RESOLVED_ANSWERED: [{ name: "resolved", kind: "boolean", dataKey: "resolved" }],
    SCHEDULE_OFFERED: [{ name: "reason", kind: "reason", dataKey: "reason" }],
    NO_SLOT: [],
    SCHEDULE_DECLINED: [],
    ATTENDEE_CHOSEN: [
        { name: "byRepresentative", kind: "boolean", dataKey: "by_representative" },
    ],
    PHONE_NOTICE_SHOWN: [],
    APPOINTMENT_CREATED: [appointmentField],
    APPOINTMENT_CONSULTED: [appointmentField],
    APPOINTMENT_RESCHEDULED: [
        appointmentField,
        { name: "from", kind: "datetime", dataKey: "from" },
        { name: "to", kind: "datetime", dataKey: "to" },
    ],
    APPOINTMENT_CANCELED: [appointmentField],
    ABANDONED: [{ name: "step", kind: "step", dataKey: "step" }],
}

const EVENT_TYPES = new Set<string>(Object.keys(EVENT_FIELDS))

const LLM_STATUSES: readonly LlmStatus[] = ["NOT_CALLED", "USED", "FAILED"]

const SCHEDULE_OFFER_REASONS: readonly ScheduleOfferReason[] = ["REQUIRES_IN_PERSON", "NOT_RESOLVED"]

const ABANDONED_STEPS: readonly AbandonedStep[] = [
    "AWAITING_CATEGORY",
    "AWAITING_QUESTION",
    "AWAITING_ANSWER",
    "AWAITING_RESOLVED",
    "AWAITING_SCHEDULE_OFFER",
    "AWAITING_ATTENDEE",
    "AWAITING_HOLDER_NAME",
    "AWAITING_HOLDER_CPF",
    "AWAITING_SLOT",
    "AWAITING_RETURN_CHOICE",
    "AWAITING_CANCEL_CONFIRMATION",
]

const ISO_DATETIME =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/

const CLOSING_EVENTS = new Map<string, (event: ConversationEvent) => boolean>([
    [
        "RESOLVED",
        (event) =>
            (event.type === "RESOLVED_ANSWERED" && event.resolved) || event.type === "ANSWER_SENT",
    ],
    ["SCHEDULED", (event) => event.type === "APPOINTMENT_CREATED"],
    ["OUT_OF_SCOPE", (event) => event.type === "ANSWER_SENT"],
    ["NO_SLOT", (event) => event.type === "NO_SLOT"],
    ["DECLINED", (event) => event.type === "SCHEDULE_DECLINED"],
    [
        "MANAGED_APPOINTMENT",
        (event) => event.type === "APPOINTMENT_RESCHEDULED" || event.type === "APPOINTMENT_CANCELED",
    ],
])

function fail(reason: string): never {
    throw new InternalServerError(`Invalid conversation event: ${reason}`)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isConversationEventType(value: unknown): value is ConversationEventType {
    return typeof value === "string" && EVENT_TYPES.has(value)
}

function isPositiveId(value: unknown): boolean {
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0
}

function isOneOf(list: readonly string[], value: unknown): boolean {
    return typeof value === "string" && list.includes(value)
}

function isCalendarDate(year: number, month: number, day: number): boolean {
    const date = new Date(Date.UTC(year, month - 1, day))
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    )
}

function isDateTime(value: unknown): boolean {
    if (typeof value !== "string") {
        return false
    }

    const match = ISO_DATETIME.exec(value)
    if (!match) {
        return false
    }

    const [year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0] = match
        .slice(1, 7)
        .map((part) => Number(part ?? "0"))
    return (
        isCalendarDate(year, month, day) &&
        hour <= 23 &&
        minute <= 59 &&
        second <= 59 &&
        Number.isFinite(Date.parse(value))
    )
}

function isValidValue(kind: FieldKind, value: unknown): boolean {
    switch (kind) {
        case "id":
            return isPositiveId(value)
        case "llm":
            return isOneOf(LLM_STATUSES, value)
        case "reason":
            return isOneOf(SCHEDULE_OFFER_REASONS, value)
        case "step":
            return isOneOf(ABANDONED_STEPS, value)
        case "boolean":
            return typeof value === "boolean"
        case "datetime":
            return isDateTime(value)
    }
}

export function validateConversationEvent(input: unknown): ConversationEvent {
    if (!isPlainObject(input)) {
        return fail("event must be an object")
    }

    const type = input.type
    if (!isConversationEventType(type)) {
        return fail("unknown type")
    }

    const fields = EVENT_FIELDS[type]
    const allowed = new Set(["type", ...fields.map((field) => field.name)])
    if (Object.keys(input).some((key) => !allowed.has(key))) {
        return fail(`unexpected field for ${type}`)
    }

    const event: Record<string, unknown> = { type }
    for (const field of fields) {
        const value = input[field.name]
        if (!isValidValue(field.kind, value)) {
            return fail(`invalid ${field.name} for ${type}`)
        }
        event[field.name] = value
    }

    return event as unknown as ConversationEvent
}

export function buildConversationEventRow(sessionId: unknown, input: unknown): ConversationEventRow {
    if (typeof sessionId !== "string" || !/^\d{1,19}$/.test(sessionId)) {
        return fail("invalid session id")
    }

    const event = validateConversationEvent(input)
    const values = event as unknown as Record<string, unknown>
    const row: ConversationEventRow = {
        sessionId,
        type: event.type,
        categoryId: null,
        questionId: null,
        appointmentId: null,
        data: {},
    }
    const data: ConversationEventData = {}

    for (const field of EVENT_FIELDS[event.type]) {
        const value = values[field.name]
        if (field.column && typeof value === "number") {
            row[field.column] = value
        }
        if (field.dataKey && (typeof value === "string" || typeof value === "boolean")) {
            data[field.dataKey] = value
        }
    }

    return { ...row, data }
}

function idFromColumn(value: string | number | null): unknown {
    if (typeof value === "string" && /^\d{1,16}$/.test(value)) {
        return Number(value)
    }
    return value
}

export function parseConversationEventRow(row: StoredConversationEventRow): RecordedConversationEvent {
    if (!isConversationEventType(row.type)) {
        return fail("unknown stored type")
    }

    const data = isPlainObject(row.data) ? row.data : {}
    const columns: Record<ColumnName, unknown> = {
        categoryId: idFromColumn(row.category_id),
        questionId: idFromColumn(row.question_id),
        appointmentId: idFromColumn(row.appointment_id),
    }
    const candidate: Record<string, unknown> = { type: row.type }

    for (const field of EVENT_FIELDS[row.type]) {
        if (field.column) {
            candidate[field.name] = columns[field.column]
        }
        if (field.dataKey) {
            candidate[field.name] = data[field.dataKey]
        }
    }

    return { ...validateConversationEvent(candidate), createdAt: row.created_at }
}

export function isClosingCompatible(closing: SessionClosing): boolean {
    if (!isPlainObject(closing) || !isPlainObject(closing.event)) {
        return false
    }

    const accepts = CLOSING_EVENTS.get(closing.outcome)
    return accepts ? accepts(closing.event) : false
}
