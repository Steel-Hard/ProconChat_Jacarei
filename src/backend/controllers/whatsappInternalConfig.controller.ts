import { NextFunction, Request, Response } from "express"
import UnauthorizedError from "../errors/UnauthorizedError"
import { WhatsAppSettingsService, whatsappSettingsService } from "../services/whatsappSettings.service"
import { isValidInternalToken } from "../utils/internalToken"

interface WhatsAppInternalConfigControllerDependencies {
    settings: Pick<WhatsAppSettingsService, "getInternalConfig">
}

class WhatsAppInternalConfigController {
    private settings: WhatsAppInternalConfigControllerDependencies["settings"]

    constructor({ settings }: WhatsAppInternalConfigControllerDependencies = { settings: whatsappSettingsService }) {
        this.settings = settings
    }

    public async get(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!isValidInternalToken(req.header("X-Internal-Token"))) {
                throw new UnauthorizedError("Invalid gateway internal token")
            }
            res.status(200).json({ data: await this.settings.getInternalConfig() })
        } catch (error) {
            next(error)
        }
    }
}

export default WhatsAppInternalConfigController
