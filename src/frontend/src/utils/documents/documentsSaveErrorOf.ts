import type AttendeeGroup from "@/types/documents/AttendeeGroup.types"
import type DocumentsSaveError from "@/types/documents/DocumentsSaveError.types"
import type DocumentsSaveIssue from "@/types/documents/DocumentsSaveIssue.types"

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function issueOf(raw: unknown): DocumentsSaveIssue | null {
    if (!isRecord(raw) || typeof raw.message !== "string") {
        return null
    }

    const [groupKey, positionKey] = typeof raw.path === "string" ? raw.path.split(".") : []
    const group: AttendeeGroup | null =
        groupKey === "holder" || groupKey === "representative" ? groupKey : null
    const index = positionKey === undefined ? Number.NaN : Number(positionKey)

    return {
        group,
        position: group !== null && Number.isInteger(index) ? index + 1 : null,
        message: raw.message
    }
}

function issuesOf(data: unknown): DocumentsSaveIssue[] {
    if (!isRecord(data) || !isRecord(data.error) || !isRecord(data.error.details)) {
        return []
    }

    const issues = data.error.details.issues

    if (!Array.isArray(issues)) {
        return []
    }

    return issues.map(issueOf).filter((issue): issue is DocumentsSaveIssue => issue !== null)
}

function documentsSaveErrorOf(error: unknown): DocumentsSaveError {
    if (!isRecord(error) || !("status" in error)) {
        return { kind: "generic", issues: [] }
    }

    if (error.status === 401) {
        return { kind: "unauthorized", issues: [] }
    }

    if (error.status === 403) {
        return { kind: "forbidden", issues: [] }
    }

    if (error.status === 400) {
        const issues = issuesOf(error.data)

        return { kind: issues.length > 0 ? "invalid" : "generic", issues }
    }

    return { kind: "generic", issues: [] }
}

export default documentsSaveErrorOf
