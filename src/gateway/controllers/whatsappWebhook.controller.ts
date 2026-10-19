import { timingSafeEqual } from "node:crypto"
import { NextFunction, Request, Response } from "express"
import { cloudApiProvider } from "../gateways/cloudApi.gateway"
import { MessageProvider } from "../gateways/messageProvider"
import { processWhatsappWebhook } from "../services/whatsappWebhook.service"
import { WhatsappWebhookResult } from "../types/whatsappWebhook.types"
import { WhatsAppConfigStore, whatsappConfigStore } from "../services/whatsappConfigStore"
import BadRequestError from "../errors/BadRequestError"
import ForbiddenError from "../errors/ForbiddenError"
import PayloadTooLargeError from "../errors/PayloadTooLargeError"
import UnauthorizedError from "../errors/UnauthorizedError"

interface WhatsappWebhookControllerDependencies {
    signatures?: Pick<MessageProvider, "verifySignature">
    processWebhook?: (payload: unknown) => Promise<WhatsappWebhookResult>
    config?: Pick<WhatsAppConfigStore, "load">
}

class WhatsappWebhookController {
    private signatures: Pick<MessageProvider, "verifySignature">
    private processWebhook: (payload: unknown) => Promise<WhatsappWebhookResult>
    private config: Pick<WhatsAppConfigStore, "load">

    constructor({
        signatures = cloudApiProvider,
        processWebhook = processWhatsappWebhook,
        config = whatsappConfigStore,
    }: WhatsappWebhookControllerDependencies = {}) {
        this.signatures = signatures
        this.processWebhook = processWebhook
        this.config = config
    }

    public async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const mode = this.queryString(req, "hub.mode")
            const token = this.queryString(req, "hub.verify_token")
            const challenge = this.queryString(req, "hub.challenge")

            if (mode !== "subscribe" || !challenge || !token) {
                throw new ForbiddenError("Invalid webhook verification")
            }

            const { verifyToken } = await this.config.load()
            if (!this.matchesVerifyToken(token, verifyToken)) {
                throw new ForbiddenError("Invalid webhook verification")
            }

            res.status(200).type("text/plain").send(challenge)
        } catch (error) {
            next(error)
        }
    }

    public async receive(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.config.load()
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
