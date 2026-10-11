import { NextFunction, Request, Response } from "express"
import { describe, expect, it, vi } from "vitest"
import ForbiddenError from "../errors/ForbiddenError"
import UnauthorizedError from "../errors/UnauthorizedError"
import { AuthenticatedUser, PERMISSIONS } from "../types/auth.types"
import { requirePermission } from "./token.middleware"

const baseUser: AuthenticatedUser = {
    id: 1,
    name: "Admin",
    email: "admin@example.test",
    isAdmin: true,
    permissions: [],
    sessionVersion: 0,
}

function invokePermissionMiddleware(permission: (typeof PERMISSIONS)[number], user?: AuthenticatedUser) {
    const req = { authUser: user } as Request
    const next = vi.fn() as NextFunction
    requirePermission(permission)(req, {} as Response, next)
    return next
}

describe("requirePermission", () => {
    it.each(PERMISSIONS)("allows an administrator to use %s", (permission) => {
        const next = invokePermissionMiddleware(permission, baseUser)
        expect(next).toHaveBeenCalledOnce()
        expect(next).toHaveBeenCalledWith()
    })

    it.each(PERMISSIONS)("allows a user holding %s", (permission) => {
        const user = { ...baseUser, isAdmin: false, permissions: [permission] }
        const next = invokePermissionMiddleware(permission, user)
        expect(next).toHaveBeenCalledWith()
    })

    it.each(PERMISSIONS)("rejects a user missing %s", (permission) => {
        const user = { ...baseUser, isAdmin: false, permissions: [] }
        const next = invokePermissionMiddleware(permission, user)
        expect(next).toHaveBeenCalledOnce()
        expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError)
    })

    it("rejects requests without an authenticated user", () => {
        const next = invokePermissionMiddleware(PERMISSIONS[0])
        expect(next).toHaveBeenCalledOnce()
        expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError)
    })
})
