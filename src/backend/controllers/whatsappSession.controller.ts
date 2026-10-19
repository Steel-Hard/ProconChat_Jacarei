import { NextFunction, Request, Response } from "express"
import { processIncomingMessage, ConversationFlowInput, ConversationFlowResponse } from "../services/conversationFlow.service"
import UnauthorizedError from "../errors/UnauthorizedError"
import { isValidInternalToken } from "../utils/internalToken"

interface WhatsappSessionControllerDependencies {
    processMessage: (input: ConversationFlowInput) => Promise<ConversationFlowResponse>
}

class WhatsappSessionController {
    private processMessage: WhatsappSessionControllerDependencies["processMessage"]

    constructor({ processMessage }: WhatsappSessionControllerDependencies = { processMessage: processIncomingMessage }) {
        this.processMessage = processMessage
    }

    public async create(req: Request<object, object, ConversationFlowInput>, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!isValidInternalToken(req.header("X-Internal-Token"))) {
                throw new UnauthorizedError("Invalid gateway internal token")
            }
            const result = await this.processMessage(req.body)
            res.status(202).json({ data: result })
        } catch (error) {
            next(error)
        }
    }
}

export default WhatsappSessionController
