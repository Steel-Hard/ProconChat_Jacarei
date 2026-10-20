import { NextFunction, Request, Response } from "express"
import UnauthorizedError from "../errors/UnauthorizedError"
import { AccountBatchBody, CreateAccountBody, ResetPasswordBody, UserIdParam } from "../schemas/userAccount.schema"
import { userAccountService as defaultUserAccountService, UserAccountService } from "../services/userAccount.service"
import type { AccountRequester } from "../types/userAccount.types"

interface UserAccountControllerDependencies {
    service: UserAccountService
}

function requesterOf(req: Request): AccountRequester {
    const user = req.authUser
    if (!user) {
        throw new UnauthorizedError("Authentication required")
    }
    return { id: user.id, isAdmin: user.isAdmin, permissions: [...user.permissions] }
}

class UserAccountController {
    private service: UserAccountService

    constructor({ service }: UserAccountControllerDependencies = { service: defaultUserAccountService }) {
        this.service = service
    }

    public async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.status(200).json({ data: await this.service.listAccounts() })
        } catch (error) {
            next(error)
        }
    }

    public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { name, email, password } = req.body as CreateAccountBody
            res.status(201).json({ data: await this.service.createAccount({ name, email, password }) })
        } catch (error) {
            next(error)
        }
    }

    public async saveBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { changes } = req.body as AccountBatchBody
            res.status(200).json({ data: await this.service.saveBatch(requesterOf(req), changes) })
        } catch (error) {
            next(error)
        }
    }

    public async futureAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params as unknown as UserIdParam
            res.status(200).json({ data: await this.service.listFutureAppointments(id) })
        } catch (error) {
            next(error)
        }
    }

    public async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params as unknown as UserIdParam
            const { password } = req.body as ResetPasswordBody
            await this.service.resetPassword(requesterOf(req), id, password)
            res.status(200).json({ data: { reset: true } })
        } catch (error) {
            next(error)
        }
    }
}

export default UserAccountController
