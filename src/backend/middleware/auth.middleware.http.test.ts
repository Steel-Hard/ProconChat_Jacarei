import express, { NextFunction, Request, Response } from "express"
import request from "supertest"
import { describe, expect, it } from "vitest"
import { ADMIN_ONLY, AuthenticatedUser, Permission, PERMISSIONS, RouteAccess } from "../types/auth.types"
import { requirePermission } from "./auth.middleware"
import errorHandler from "./errorHandler.middleware"

function buildApp(permission: RouteAccess, user?: AuthenticatedUser) {
    const app = express()
    app.use((req: Request, _res: Response, next: NextFunction) => {
        req.authUser = user
        next()
    })
    app.get("/painel", requirePermission(permission), (_req, res) => {
        res.status(200).json({ data: { ok: true } })
    })
    app.use(errorHandler)
    return app
}

const admin: AuthenticatedUser = {
    id: 1,
    name: "Admin",
    email: "admin@exemplo.test",
    isAdmin: true,
    permissions: [...PERMISSIONS],
    sessionVersion: 0,
}

const staff = (permissions: Permission[]): AuthenticatedUser => ({
    id: 2,
    name: "Equipe",
    email: "equipe@exemplo.test",
    isAdmin: false,
    permissions,
    sessionVersion: 0,
})

describe("requirePermission", () => {
    it.each(PERMISSIONS)("responde 403 FORBIDDEN para a conta sem %s", async (permission) => {
        const others = PERMISSIONS.filter((candidate) => candidate !== permission)

        const response = await request(buildApp(permission, staff(others))).get("/painel")

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "FORBIDDEN", message: "Insufficient permission" } })
    })

    it.each(PERMISSIONS)("libera %s para o Admin", async (permission) => {
        const response = await request(buildApp(permission, { ...admin, permissions: [] })).get("/painel")

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { ok: true } })
    })

    it.each(PERMISSIONS)("libera %s para quem tem a chave", async (permission) => {
        const response = await request(buildApp(permission, staff([permission]))).get("/painel")

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { ok: true } })
    })

    it("responde 401 quando nao ha usuario autenticado", async () => {
        const response = await request(buildApp("users.manage")).get("/painel")

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Authentication required" } })
    })
})

describe("requirePermission(ADMIN_ONLY)", () => {
    it("libera o Admin", async () => {
        const response = await request(buildApp(ADMIN_ONLY, admin)).get("/painel")

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { ok: true } })
    })

    it("responde 403 FORBIDDEN para o funcionario com as 8 permissoes", async () => {
        const response = await request(buildApp(ADMIN_ONLY, staff([...PERMISSIONS]))).get("/painel")

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "FORBIDDEN", message: "Insufficient permission" } })
    })

    it("responde 401 quando nao ha usuario autenticado", async () => {
        const response = await request(buildApp(ADMIN_ONLY)).get("/painel")

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Authentication required" } })
    })
})
