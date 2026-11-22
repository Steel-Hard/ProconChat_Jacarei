import type ScheduleCancellationNoticeState from "@/types/schedule/ScheduleCancellationNoticeState.types"
import type ScheduleConflict from "@/types/schedule/ScheduleConflict.types"
import type ScheduleConflictChange from "@/types/schedule/ScheduleConflictChange.types"
import type ScheduleConflictCode from "@/types/schedule/ScheduleConflictCode.types"
import type ScheduleFieldIssue from "@/types/schedule/ScheduleFieldIssue.types"
import type ScheduleSaveError from "@/types/schedule/ScheduleSaveError.types"
import type WhatsAppCancellationNoticeProblemCode from "@/types/whatsapp/WhatsAppCancellationNoticeProblemCode.types"

const CONFLICT_CODES: readonly string[] = [
    "DATE_BLOCKED",
    "PERIOD_BLOCKED",
    "DAY_WITHOUT_SERVICE",
    "DURATION_CHANGED",
    "RANGE_CHANGED",
    "SEATS_REDUCED",
    "RESPONSIBLE_OVERLAP"
] satisfies ScheduleConflictCode[]

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function isText(value: unknown): value is string {
    return typeof value === "string"
}

function conflictOf(item: unknown): ScheduleConflict | null {
    if (!isRecord(item)) {
        return null
    }

    const { id, protocol, name, cpfMasked, date, time, status, code, reason } = item
    const valid =
        isText(id) &&
        isText(protocol) &&
        isText(name) &&
        isText(cpfMasked) &&
        isText(date) &&
        isText(time) &&
        isText(reason) &&
        (status === "PENDING" || status === "CONFIRMED") &&
        isText(code) &&
        CONFLICT_CODES.includes(code)

    if (!valid) {
        return null
    }

    return {
        id,
        protocol,
        name,
        cpfMasked,
        date,
        time,
        status,
        code: code as ScheduleConflictCode,
        reason
    }
}

function noticeOf(value: unknown): ScheduleCancellationNoticeState | null {
    if (!isRecord(value) || typeof value.enabled !== "boolean") {
        return null
    }

    const { problem } = value

    if (problem === null || problem === undefined) {
        return { enabled: value.enabled, problem: null }
    }

    if (
        !isRecord(problem) ||
        !isText(problem.code) ||
        !isText(problem.message) ||
        !(problem.metaErrorCode === null || isText(problem.metaErrorCode))
    ) {
        return null
    }

    return {
        enabled: value.enabled,
        problem: {
            code: problem.code as WhatsAppCancellationNoticeProblemCode,
            metaErrorCode: problem.metaErrorCode,
            message: problem.message
        }
    }
}

function changesOf(value: unknown): ScheduleConflictChange[] {
    if (!Array.isArray(value)) {
        return []
    }

    return value.filter(
        (item): item is ScheduleConflictChange => item === "CONFLICTS" || item === "NOTICE"
    )
}

function issueOf(item: unknown): ScheduleFieldIssue | null {
    if (!isRecord(item) || !isText(item.path) || !isText(item.message)) {
        return null
    }

    return { path: item.path, message: item.message }
}

function listOf<T>(value: unknown, read: (item: unknown) => T | null): T[] | null {
    if (!Array.isArray(value)) {
        return null
    }

    return value.map(read).filter((item): item is T => item !== null)
}

function scheduleSaveErrorOf(error: unknown): ScheduleSaveError | null {
    if (!isRecord(error)) {
        return { kind: "failed" }
    }

    if (error.status === 401) {
        return null
    }

    const body = isRecord(error.data) && isRecord(error.data.error) ? error.data.error : {}
    const details = isRecord(body.details) ? body.details : {}

    if (
        error.status === 409 &&
        (body.code === "SCHEDULE_CONFLICTS" || body.code === "SCHEDULE_CONFLICTS_CHANGED")
    ) {
        const changed = body.code === "SCHEDULE_CONFLICTS_CHANGED"
        const conflicts = listOf(details.conflicts, conflictOf)
        const notice = noticeOf(details.cancellationNotice)

        if (conflicts !== null && conflicts.length > 0 && (!changed || notice !== null)) {
            return {
                kind: "conflicts",
                conflicts,
                changed,
                notice,
                changes: changed ? changesOf(details.changes) : []
            }
        }
    }

    if (error.status === 400) {
        const issues = listOf(details.issues, issueOf)

        if (issues !== null) {
            return { kind: "issues", issues }
        }
    }

    if (error.status === 403 && body.code === "INVALID_ORIGIN") {
        return { kind: "invalidOrigin" }
    }

    return { kind: "failed" }
}

export default scheduleSaveErrorOf
