import { timingSafeEqual } from "node:crypto"
import { NextFunction, Request, Response } from "express"
import { cloudApiProvider } from "../gateways/cloudApi.gateway"
import { MessageProvider } from "../gateways/messageProvider"
import { processWhatsappWebhook } from "../services/whatsappWebhook.service"
import { WhatsappWebhookResult } from "../types/whatsappWebhook.types"
import { readWhatsAppConfigFromEnv } from "../utils/whatsappConfig"
import BadRequestError from "../errors/BadRequestError"
import ForbiddenError from "../errors/ForbiddenError"
import PayloadTooLargeError from "../errors/PayloadTooLargeError"
import UnauthorizedError from "../errors/UnauthorizedError"

interface WhatsappWebhookControllerDependencies {
    signatures: Pick<MessageProvider, "verifySignature">
    processWebhook: (payload: unknown) => Promise<WhatsappWebhookResult>
}

class WhatsappWebhookController {
    private signatures: WhatsappWebhookControllerDependencies["signatures"]
    private processWebhook: WhatsappWebhookControllerDependencies["processWebhook"]

    constructor(
        { signatures, processWebhook }: WhatsappWebhookControllerDependencies = {
            signatures: cloudApiProvider,
            processWebhook: processWhatsappWebhook,
        },
    ) {
        this.signatures = signatures
        this.processWebhook = processWebhook
    }

    public verify(req: Request, res: Response, next: NextFunction): void {
        const mode = this.queryString(req, "hub.mode")
        const token = this.queryString(req, "hub.verify_token")
        const challenge = this.queryString(req, "hub.challenge")
        const { verifyToken } = readWhatsAppConfigFromEnv()

        if (mode !== "subscribe" || !challenge || !this.matchesVerifyToken(token, verifyToken)) {
            next(new ForbiddenError("Invalid webhook verification"))
            return
        }

        res.status(200).type("text/plain").send(challenge)
    }

    public async receive(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)

            if (!this.signatures.verifySignature(rawBody, req.get("X-Hub-Signature-256"))) {
                throw new UnauthorizedError("Invalid webhook signature")
            }

            let payload: unknown
            try {
                payload = JSON.parse(rawBody.toString("utf8"))
            } catch {
                throw new BadRequestError("Invalid JSON body")
            }

            const result = await this.processWebhook(payload)
            res.status(200).json({ data: result })
        } catch (error) {
            next(error)
        }
    }

    public handleRawBodyError(error: unknown, _req: Request, _res: Response, next: NextFunction): void {
        const { type, status } = (error ?? {}) as { type?: unknown; status?: unknown }
        if (type === "entity.too.large" || status === 413) {
            next(new PayloadTooLargeError("Payload too large"))
            return
        }
        if (typeof status === "number" && status >= 400 && status <= 499) {
            next(new BadRequestError("Invalid request body"))
            return
        }
        next(error)
    }

    private queryString(req: Request, name: string): string | undefined {
        const value = req.query[name]
        return typeof value === "string" && value !== "" ? value : undefined
    }

    private matchesVerifyToken(received: string | undefined, expected: string): boolean {
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
}

export default WhatsappWebhookController
