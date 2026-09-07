import { NextFunction, Request, Response } from "express"
import { processEvolutionWebhook } from "../services/evolutionWebhook.service"
import { EvolutionWebhookPayload } from "../types/evolution.types"
import UnauthorizedError from "../errors/UnauthorizedError"

export async function receiveEvolutionWebhook(
    req: Request<object, object, EvolutionWebhookPayload>,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        if (req.query.token !== process.env.EVOLUTION_WEBHOOK_TOKEN) {
            throw new UnauthorizedError("Invalid Evolution webhook token")
        }
        const result = await processEvolutionWebhook(req.body)
        res.status(202).json({ data: result })
    } catch (error) {
        next(error)
    }
}
