import { ListRow, OutgoingMessage, OutgoingTemplateRequest, ReplyButton } from "../types/message.types"

export const OUTGOING_LIMITS = {
    textBody: 4096,
    listBody: 4096,
    buttonsBody: 1024,
    listButtonText: 20,
    listRowsMax: 10,
    rowTitle: 24,
    rowDescription: 72,
    rowId: 200,
    buttonsMax: 3,
    buttonTitle: 20,
    buttonId: 256,
    footer: 60,
} as const

export type OutgoingMessageValidation = { ok: true } | { ok: false; reason: string }

export class OutgoingMessageValidationError extends Error {
    public readonly reason: string

    constructor(reason: string) {
        super(`Invalid outgoing message: ${reason}`)
        this.name = "OutgoingMessageValidationError"
        this.reason = reason
    }
}

function length(value: string): number {
    return Array.from(value).length
}

function isFilledWithin(value: string | undefined, max: number): boolean {
    return value !== undefined && value.trim() !== "" && length(value) <= max
}

function findIdProblem(ids: string[], max: number): string | undefined {
    if (ids.some((id) => !isFilledWithin(id, max))) {
        return "invalid_option_id"
    }
    if (new Set(ids).size !== ids.length) {
        return "duplicate_option_id"
    }
    return undefined
}

function validateRows(rows: ListRow[]): string | undefined {
    if (rows.length < 1 || rows.length > OUTGOING_LIMITS.listRowsMax) {
        return "invalid_row_count"
    }
    if (rows.some((row) => !isFilledWithin(row.title, OUTGOING_LIMITS.rowTitle))) {
        return "invalid_row_title"
    }
    if (rows.some((row) => row.description !== undefined && length(row.description) > OUTGOING_LIMITS.rowDescription)) {
        return "invalid_row_description"
    }
    return findIdProblem(
        rows.map((row) => row.id),
        OUTGOING_LIMITS.rowId,
    )
}

function validateButtons(buttons: ReplyButton[]): string | undefined {
    if (buttons.length < 1 || buttons.length > OUTGOING_LIMITS.buttonsMax) {
        return "invalid_button_count"
    }
    if (buttons.some((button) => !isFilledWithin(button.title, OUTGOING_LIMITS.buttonTitle))) {
        return "invalid_button_title"
    }
    return findIdProblem(
        buttons.map((button) => button.id),
        OUTGOING_LIMITS.buttonId,
    )
}

function findProblem(message: OutgoingMessage): string | undefined {
    switch (message.type) {
        case "text":
            return isFilledWithin(message.text, OUTGOING_LIMITS.textBody) ? undefined : "invalid_text"
        case "list":
            if (!isFilledWithin(message.text, OUTGOING_LIMITS.listBody)) {
                return "invalid_text"
            }
            if (!isFilledWithin(message.buttonText, OUTGOING_LIMITS.listButtonText)) {
                return "invalid_button_text"
            }
            if (message.footer !== undefined && !isFilledWithin(message.footer, OUTGOING_LIMITS.footer)) {
                return "invalid_footer"
            }
            return validateRows(message.rows)
        case "buttons":
            if (!isFilledWithin(message.text, OUTGOING_LIMITS.buttonsBody)) {
                return "invalid_text"
            }
            if (message.footer !== undefined && !isFilledWithin(message.footer, OUTGOING_LIMITS.footer)) {
                return "invalid_footer"
            }
            return validateButtons(message.buttons)
        default:
            return "unsupported_type"
    }
}

export function validateOutgoingMessage(message: OutgoingMessage): OutgoingMessageValidation {
    const reason = findProblem(message)
    return reason === undefined ? { ok: true } : { ok: false, reason }
}

const TEMPLATE_TO_PATTERN = /^\d{8,15}$/
const TEMPLATE_NAME_PATTERN = /^[a-z0-9_]{1,512}$/
const TEMPLATE_LANGUAGE_PATTERN = /^[a-z]{2}(_[A-Z]{2})?$/

function isValidParameter(value: unknown): value is string {
    return typeof value === "string" && value.trim() !== "" && !/[\n\t]/.test(value) && !/ {5,}/.test(value)
}

function isValidParameterList(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(isValidParameter)
}

export type OutgoingTemplateValidation = { ok: true; value: OutgoingTemplateRequest } | { ok: false; reason: string }

export function validateOutgoingTemplate(input: unknown): OutgoingTemplateValidation {
    const { to, name, languageCode, bodyParameters } = (input ?? {}) as Record<string, unknown>
    if (typeof to !== "string" || !TEMPLATE_TO_PATTERN.test(to)) {
        return { ok: false, reason: "invalid_to" }
    }
    if (typeof name !== "string" || !TEMPLATE_NAME_PATTERN.test(name)) {
        return { ok: false, reason: "invalid_template_name" }
    }
    if (typeof languageCode !== "string" || !TEMPLATE_LANGUAGE_PATTERN.test(languageCode)) {
        return { ok: false, reason: "invalid_language_code" }
    }
    if (!isValidParameterList(bodyParameters)) {
        return { ok: false, reason: "invalid_parameter" }
    }
    return {
        ok: true,
        value: {
            to,
            template: { name, languageCode, bodyParameters },
        },
    }
}
