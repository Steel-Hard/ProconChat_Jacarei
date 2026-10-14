import { NextFunction, Request, Response } from "express"
import UnauthorizedError from "../errors/UnauthorizedError"
import { WhatsAppConfigStore, whatsappConfigStore } from "../services/whatsappConfigStore"
import { isValidInternalToken } from "../utils/internalToken"

interface InternalConfigControllerDependencies {
    config: Pick<WhatsAppConfigStore, "invalidate">
}

class InternalConfigController {
    private config: InternalConfigControllerDependencies["config"]

    constructor({ config }: InternalConfigControllerDependencies = { config: whatsappConfigStore }) {
        this.config = config
    }

    public reload(req: Request, res: Response, next: NextFunction): void {
        if (!isValidInternalToken(req.get("X-Internal-Token"))) {
            next(new UnauthorizedError("Invalid internal token"))
            return
        }
        this.config.invalidate()
        res.status(204).end()
    }
}

export default InternalConfigController
