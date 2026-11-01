import { NextFunction, Request, Response } from "express"
import AppError from "../errors/AppError"
import BadGatewayError from "../errors/BadGatewayError"
import BadRequestError from "../errors/BadRequestError"
import UnauthorizedError from "../errors/UnauthorizedError"
import { cloudApiProvider } from "../gateways/cloudApi.gateway"
import { MessageProvider } from "../gateways/messageProvider"
import { validateOutgoingTemplate } from "../gateways/outgoingMessage.validation"
import { WhatsAppConfigStore, whatsappConfigStore } from "../services/whatsappConfigStore"
import { isValidInternalToken } from "../utils/internalToken"

export interface InternalMessagesControllerDependencies {
    config?: Pick<WhatsAppConfigStore, "load">
    provider?: Pick<MessageProvider, "sendTemplate">
    logger?: Pick<Console, "log">
}

class InternalMessagesController {
    private config: Pick<WhatsAppConfigStore, "load">
    private provider: Pick<MessageProvider, "sendTemplate">
    private logger: Pick<Console, "log">

    constructor({
        config = whatsappConfigStore,
        provider = cloudApiProvider,
        logger = console,
    }: InternalMessagesControllerDependencies = {}) {
        this.config = config
        this.provider = provider
        this.logger = logger
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
}

export default InternalMessagesController
