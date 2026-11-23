import { NextFunction, Request, Response } from "express"
import UnauthorizedError from "../errors/UnauthorizedError"
import { documentsService, DocumentsService } from "../services/documents.service"
import { DocumentsBodyInput, PreviewBodyInput } from "../schemas/documents.schema"

export class DocumentsController {
    private service: DocumentsService

    constructor(service: DocumentsService = documentsService) {
        this.service = service
    }

    private userId(req: Request): number {
        const id = req.authUser?.id
        if (typeof id !== "number") {
            throw new UnauthorizedError("Autenticação necessária")
        }
        return id
    }

    public async get(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await this.service.getDocumentsView()
            res.status(200).json({ data })
        } catch (error) {
            next(error)
        }
    }

    public async save(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const actorUserId = this.userId(req)
            const body = req.body as DocumentsBodyInput
            const data = await this.service.saveDocuments(body, actorUserId)
            res.status(200).json({ data })
        } catch (error) {
            next(error)
        }
    }

    public async preview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const body = req.body as PreviewBodyInput
            const data = await this.service.previewConfirmation(body)
            res.status(200).json({ data })
        } catch (error) {
            next(error)
        }
    }
}

export default DocumentsController
