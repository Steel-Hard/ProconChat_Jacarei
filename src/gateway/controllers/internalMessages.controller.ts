import { NextFunction, Request, Response } from "express"
import AppError from "../errors/AppError"
import BadGatewayError from "../errors/BadGatewayError"
import BadRequestError from "../errors/BadRequestError"
import UnauthorizedError from "../errors/UnauthorizedError"
import { cloudApiProvider } from "../gateways/cloudApi.gateway"
import { MessageProvider } from "../gateways/messageProvider"
import { validateOutgoingTemplate, validateOutgoingText } from "../gateways/outgoingMessage.validation"
import { PhoneQueue, whatsappPhoneQueue } from "../services/phoneQueue"
import { WhatsAppConfigStore, whatsappConfigStore } from "../services/whatsappConfigStore"
import { isValidInternalToken } from "../utils/internalToken"

export interface InternalMessagesControllerDependencies {
    config?: Pick<WhatsAppConfigStore, "load">
    provider?: Pick<MessageProvider, "sendTemplate" | "send">
    logger?: Pick<Console, "log">
    queue?: PhoneQueue
}

class InternalMessagesController {
    private config: Pick<WhatsAppConfigStore, "load">
    private provider: Pick<MessageProvider, "sendTemplate" | "send">
    private logger: Pick<Console, "log">
    private queue: PhoneQueue

    constructor({
        config = whatsappConfigStore,
        provider = cloudApiProvider,
        logger = console,
        queue = whatsappPhoneQueue,
    }: InternalMessagesControllerDependencies = {}) {
        this.config = config
        this.provider = provider
        this.logger = logger
        this.queue = queue
    }

    public async sendTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!isValidInternalToken(req.get("X-Internal-Token"))) {
            next(new UnauthorizedError("Invalid internal token"))
            return
        }
        const validation = validateOutgoingTemplate(req.body)
        if (!validation.ok) {
            next(new BadRequestError(`Invalid template message: ${validation.reason}`))
            return
        }
        try {
            await this.config.load()
            const { providerMessageId } = await this.provider.sendTemplate(validation.value.to, validation.value.template)
            res.status(200).json({ data: { providerMessageId } })
        } catch (error) {
            if (error instanceof AppError) {
                next(error)
                return
            }
            this.logger.log(JSON.stringify({ event: "template_send_failed", template: validation.value.template.name }))
            next(new BadGatewayError("WhatsApp provider did not accept the message"))
        }
    }

    public async sendText(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!isValidInternalToken(req.get("X-Internal-Token"))) {
            next(new UnauthorizedError("Invalid internal token"))
            return
        }
        const validation = validateOutgoingText(req.body)
        if (!validation.ok) {
            next(new BadRequestError(`Invalid text message: ${validation.reason}`))
            return
        }
        const { to, message } = validation.value
        try {
            await this.config.load()
            await this.queue.run(to, () => this.provider.send(to, message))
            res.status(200).json({ data: { sent: true } })
        } catch (error) {
            if (error instanceof AppError) {
                next(error)
                return
            }
            this.logger.log(JSON.stringify({ event: "text_send_failed" }))
            next(new BadGatewayError("WhatsApp provider did not accept the message"))
        }
    }
}

export default InternalMessagesController
