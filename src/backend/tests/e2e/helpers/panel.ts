import request from "supertest"
import type { E2eEnvironment } from "./e2eEnvironment"

export type PanelAction = "claim" | "attended"

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
const ACCESS_COOKIE = "proconchat_access"

export async function loginStaff(env: E2eEnvironment): Promise<string> {
    const response = await request(env.backendApp)
        .post("/api/v1/auth/login")
        .set("Origin", FRONTEND_ORIGIN)
        .send({ email: env.staff.email, password: env.staff.password })
    if (response.status !== 200) {
        throw new Error(`Login da equipe falhou com status ${response.status}`)
    }
    const setCookie = response.headers["set-cookie"] as unknown as string[] | undefined
    const access = setCookie?.find((cookie) => cookie.startsWith(`${ACCESS_COOKIE}=`))
    if (!access) {
        throw new Error("Cookie de acesso não veio no login")
    }
    return access.split(";")[0] as string
}

export function panelAction(env: E2eEnvironment, cookie: string, appointmentId: number, action: PanelAction): Promise<request.Response> {
    return request(env.backendApp)
        .patch(`/api/v1/appointments/${appointmentId}/status`)
        .set("Cookie", cookie)
        .set("Origin", FRONTEND_ORIGIN)
        .send({ action })
}

export function appointmentDetail(env: E2eEnvironment, cookie: string, appointmentId: number): Promise<request.Response> {
    return request(env.backendApp).get(`/api/v1/appointments/${appointmentId}`).set("Cookie", cookie)
}
