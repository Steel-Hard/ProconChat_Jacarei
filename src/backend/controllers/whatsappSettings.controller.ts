import { NextFunction, Request, Response } from "express"
import UnauthorizedError from "../errors/UnauthorizedError"
import { WhatsAppSettingsService, whatsappSettingsService } from "../services/whatsappSettings.service"

interface WhatsAppSettingsControllerDependencies {
    settings: WhatsAppSettingsService
}

class WhatsAppSettingsController {
    private settings: WhatsAppSettingsService

    constructor({ settings }: WhatsAppSettingsControllerDependencies = { settings: whatsappSettingsService }) {
        this.settings = settings
    }

    public async get(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.status(200).json({ data: await this.settings.getView() })
        } catch (error) {
            next(error)
        }
    }

    public async test(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.status(200).json({ data: await this.settings.testConnection(req.body) })
        } catch (error) {
            next(error)
        }
    }

    public async save(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.status(200).json({ data: await this.settings.save(req.body, this.userId(req)) })
        } catch (error) {
            next(error)
        }
    }

    public async pause(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.status(200).json({ data: await this.settings.pause(this.userId(req)) })
        } catch (error) {
            next(error)
        }
    }

    public async resume(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.status(200).json({ data: await this.settings.resume(this.userId(req)) })
        } catch (error) {
            next(error)
        }
    }

    public async templates(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.status(200).json({ data: await this.settings.getTemplatesStatus() })
        } catch (error) {
            next(error)
        }
    }

    public async numberStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.status(200).json({ data: await this.settings.getNumberStatus() })
        } catch (error) {
            next(error)
        }
    }

    private userId(req: Request): number {
        if (!req.authUser) {
            throw new UnauthorizedError("Authentication required")
        }
        return req.authUser.id
    }
}

export default WhatsAppSettingsController
