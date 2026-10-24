import { describe, expect, it } from "vitest"
import scheduleSaveErrorOf from "@/utils/schedule/scheduleSaveErrorOf"

const CONFLICT = {
    id: "41",
    protocol: "A1B2C3D4",
    name: "Maria Souza",
    cpfMasked: "***.982.247-**",
    appointmentDatetime: "2026-11-04T12:00:00.000Z",
    date: "2026-11-04",
    time: "09:00",
    status: "CONFIRMED",
    code: "DATE_BLOCKED",
    reason: "Data bloqueada: Feriado"
}

function failure(status: number, error: unknown) {
    return { status, data: { error } }
}

describe("scheduleSaveErrorOf", () => {
    it("devolve null no 401, porque a renovação de sessão cuida", () => {
        expect(scheduleSaveErrorOf(failure(401, { code: "UNAUTHORIZED", message: "x" }))).toBeNull()
    })

    it("lê os conflitos do 409 SCHEDULE_CONFLICTS só com os campos do contrato", () => {
        const error = failure(409, {
            code: "SCHEDULE_CONFLICTS",
            message: "x",
            details: { conflicts: [CONFLICT, { protocol: "SEMDATA1" }] }
        })

        expect(scheduleSaveErrorOf(error)).toEqual({
            kind: "conflicts",
            conflicts: [
                {
                    protocol: "A1B2C3D4",
                    name: "Maria Souza",
                    cpfMasked: "***.982.247-**",
                    date: "2026-11-04",
                    time: "09:00",
                    status: "CONFIRMED",
                    code: "DATE_BLOCKED",
                    reason: "Data bloqueada: Feriado"
                }
            ]
        })
    })

    it("lê os problemas por campo do 400", () => {
        const error = failure(400, {
            code: "BAD_REQUEST",
            message: "x",
            details: {
                issues: [
                    { path: "ranges.2.endTime", message: "O fim deve ser depois do início" },
                    { path: 3, message: "inválido" }
                ]
            }
        })

        expect(scheduleSaveErrorOf(error)).toEqual({
            kind: "issues",
            issues: [{ path: "ranges.2.endTime", message: "O fim deve ser depois do início" }]
        })
    })

    it("reconhece o 403 INVALID_ORIGIN", () => {
        expect(scheduleSaveErrorOf(failure(403, { code: "INVALID_ORIGIN", message: "x" }))).toEqual(
            {
                kind: "invalidOrigin"
            }
        )
    })

    it.each([
        ["500", failure(500, { code: "INTERNAL_ERROR", message: "x" })],
        ["corpo sem error", { status: 502, data: "Bad Gateway" }],
        ["409 sem lista", failure(409, { code: "SCHEDULE_CONFLICTS", message: "x" })],
        ["400 sem issues", failure(400, { code: "BAD_REQUEST", message: "x" })],
        ["403 sem origem", failure(403, { code: "FORBIDDEN", message: "x" })],
        ["erro de rede", { status: "FETCH_ERROR", error: "TypeError" }],
        ["valor desconhecido", "boom"]
    ])("devolve falha geral para %s", (_label, error) => {
        expect(scheduleSaveErrorOf(error)).toEqual({ kind: "failed" })
    })
})
