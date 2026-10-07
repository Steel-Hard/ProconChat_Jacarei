import { NextFunction, Request, Response } from "express"
import ForbiddenError from "../errors/ForbiddenError"
import UnauthorizedError from "../errors/UnauthorizedError"
import { PermissionKey } from "../types/auth.types"

export function requirePermission(permission: PermissionKey) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Permite injeção de usuário via headers (útil em testes e transição de auth)
    if (!req.user && req.header("x-user-id")) {
      const isAdmin = req.header("x-user-is-admin") === "true"
      const permissionsHeader = req.header("x-user-permissions")
      const permissions = permissionsHeader
        ? (permissionsHeader.split(",").map((p) => p.trim()) as PermissionKey[])
        : []

      req.user = {
        id: Number(req.header("x-user-id")),
        name: req.header("x-user-name") || "Usuário",
        email: req.header("x-user-email") || "usuario@procon.sp.gov.br",
        is_admin: isAdmin,
        permissions,
      }
    }

    if (!req.user) {
      next(new UnauthorizedError("Não autenticado"))
      return
    }

    // Administrador possui todas as permissões (Decisão 004)
    if (req.user.is_admin) {
      next()
      return
    }

    // Se o usuário tiver permissão explícita
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      next()
      return
    }

    next(new ForbiddenError("Permissão insuficiente"))
  }
}
