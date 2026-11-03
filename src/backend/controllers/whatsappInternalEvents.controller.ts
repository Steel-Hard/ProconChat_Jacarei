import { NextFunction, Request, Response } from "express"
import UnauthorizedError from "../errors/UnauthorizedError"
import { RecordWhatsAppEvents, recordWhatsAppEvents } from "../services/whatsappEvents.service"
import { isValidInternalToken } from "../utils/internalToken"

class WhatsAppInternalEventsController {
    private record: RecordWhatsAppEvents

    constructor(record: RecordWhatsAppEvents = recordWhatsAppEvents) {
        this.record = record
    }

    public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!isValidInternalToken(req.header("X-Internal-Token"))) {
                throw new UnauthorizedError("Invalid gateway internal token")
            }
            await this.record(req.body)
            res.status(204).end()
        } catch (error) {
            next(error)
        }
    }
}

export default WhatsAppInternalEventsController
