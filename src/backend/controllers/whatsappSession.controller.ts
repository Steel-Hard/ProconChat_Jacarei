import { NextFunction, Request, Response } from "express"
import { processIncomingMessage, ConversationFlowInput } from "../services/conversationFlow.service"
import UnauthorizedError from "../errors/UnauthorizedError"

export async function createWhatsappSession(
    req: Request<object, object, ConversationFlowInput>,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        if (req.header("X-Internal-Token") !== process.env.GATEWAY_INTERNAL_TOKEN) {
            throw new UnauthorizedError("Invalid gateway internal token")
        }
        const result = await processIncomingMessage(req.body)
        res.status(202).json({ data: result })
    } catch (error) {
        next(error)
    }
}
