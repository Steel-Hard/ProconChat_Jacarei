import { NextFunction, Request, Response } from "express"
import UnauthorizedError from "../errors/UnauthorizedError"
import { PrivacySettingsService, privacySettingsService } from "../services/privacySettings.service"

interface PrivacySettingsControllerDependencies {
    settings: PrivacySettingsService
}

class PrivacySettingsController {
    private settings: PrivacySettingsService

    constructor({ settings }: PrivacySettingsControllerDependencies = { settings: privacySettingsService }) {
        this.settings = settings
    }

    public async getAdmin(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.status(200).json({ data: await this.settings.getAdminView() })
        } catch (error) {
            next(error)
        }
    }

    public async getPublic(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            res.status(200).json({ data: await this.settings.getPublicView() })
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

    private userId(req: Request): number {
        if (!req.authUser) {
            throw new UnauthorizedError("Authentication required")
        }
        return req.authUser.id
    }
}

export default PrivacySettingsController
