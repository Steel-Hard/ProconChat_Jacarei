import { timingSafeEqual } from "node:crypto"
import { NextFunction, Request, Response } from "express"
import { cloudApiProvider } from "../gateways/cloudApi.gateway"
import { processWhatsappWebhook } from "../services/whatsappWebhook.service"
import { readWhatsAppConfigFromEnv } from "../utils/whatsappConfig"
import BadRequestError from "../errors/BadRequestError"
import ForbiddenError from "../errors/ForbiddenError"
import PayloadTooLargeError from "../errors/PayloadTooLargeError"
import UnauthorizedError from "../errors/UnauthorizedError"

function queryString(req: Request, name: string): string | undefined {
    const value = req.query[name]
    return typeof value === "string" && value !== "" ? value : undefined
}

function matchesVerifyToken(received: string | undefined, expected: string): boolean {
    if (!received || !expected) {
        return false
    }
    const receivedBuffer = Buffer.from(received)
    const expectedBuffer = Buffer.from(expected)
    if (receivedBuffer.length !== expectedBuffer.length) {
        return false
    }
    return timingSafeEqual(receivedBuffer, expectedBuffer)
}

export function verifyWhatsappWebhook(req: Request, res: Response, next: NextFunction): void {
    const mode = queryString(req, "hub.mode")
    const token = queryString(req, "hub.verify_token")
    const challenge = queryString(req, "hub.challenge")
    const { verifyToken } = readWhatsAppConfigFromEnv()

    if (mode !== "subscribe" || !challenge || !matchesVerifyToken(token, verifyToken)) {
        next(new ForbiddenError("Invalid webhook verification"))
        return
    }

    res.status(200).type("text/plain").send(challenge)
}

export async function receiveWhatsappWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)

        if (!cloudApiProvider.verifySignature(rawBody, req.get("X-Hub-Signature-256"))) {
            throw new UnauthorizedError("Invalid webhook signature")
        }

        let payload: unknown
        try {
            payload = JSON.parse(rawBody.toString("utf8"))
        } catch {
            throw new BadRequestError("Invalid JSON body")
        }

        const result = await processWhatsappWebhook(payload)
        res.status(200).json({ data: result })
    } catch (error) {
        next(error)
    }
}

export function handleRawBodyError(
    error: unknown,
    _req: Request,
    _res: Response,
    next: NextFunction,
): void {
    const type = (error as { type?: unknown } | null)?.type
    next(type === "entity.too.large" ? new PayloadTooLargeError("Payload too large") : error)
}
