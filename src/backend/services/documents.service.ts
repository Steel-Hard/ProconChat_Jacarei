import { documentsRepository } from "../repositories/documents.repository"
import { IDocumentsRepository } from "../repositories/documents.repository.interface"
import { formatarConfirmacaoAgendamento } from "./messageFormatter.service"

export interface DocumentsViewOutput {
    holder: string[]
    representative: string[]
    updatedBy: { id: number; name: string } | null
    updatedAt: string | null
    unitAddress: string
    unitAddressComplement: string | null
    reminderEnabled: boolean
    reminderHours: number
    sampleQuestions: Array<{
        id: string
        title: string
        documents: string[]
    }>
}

export interface PreviewConfirmationArgs {
    byRepresentative: boolean
    groupDocuments: string[]
    questionId?: string | number
}

export class DocumentsService {
    private repository: IDocumentsRepository

    constructor(repository: IDocumentsRepository = documentsRepository) {
        this.repository = repository
    }

    async getDocumentsView(): Promise<DocumentsViewOutput> {
        const [config, lastChange, scheduleContext, sampleQuestions] = await Promise.all([
            this.repository.getDocumentsConfig(),
            this.repository.getLastChange(),
            this.repository.getScheduleContext(),
            this.repository.getSampleQuestions()
        ])

        return {
            holder: config.holder,
            representative: config.representative,
            updatedBy: lastChange ? { id: lastChange.id, name: lastChange.name } : null,
            updatedAt: lastChange ? lastChange.at : null,
            unitAddress: scheduleContext.unitAddress,
            unitAddressComplement: scheduleContext.unitAddressComplement,
            reminderEnabled: scheduleContext.reminderEnabled,
            reminderHours: scheduleContext.reminderHours,
            sampleQuestions
        }
    }

    async saveDocuments(
        data: { holder: string[]; representative: string[] },
        actorUserId: number
    ): Promise<DocumentsViewOutput> {
        await this.repository.saveDocumentsConfig(data, actorUserId)
        return this.getDocumentsView()
    }

    async previewConfirmation(args: PreviewConfirmationArgs): Promise<{ text: string }> {
        const scheduleContext = await this.repository.getScheduleContext()
        let questionDocuments: string[] = []

        if (args.questionId !== undefined && args.questionId !== "") {
            const qId = Number(args.questionId)
            if (!isNaN(qId) && qId > 0) {
                questionDocuments = await this.repository.getQuestionDocuments(qId)
            }
        }

        const text = formatarConfirmacaoAgendamento({
            protocol: "A3F9C21B",
            quando: "Ter, 10/11 às 14:00",
            unitAddress: scheduleContext.unitAddress,
            unitAddressComplement: scheduleContext.unitAddressComplement,
            byRepresentative: args.byRepresentative,
            groupDocuments: args.groupDocuments,
            questionDocuments,
            reminderEnabled: scheduleContext.reminderEnabled,
            reminderHours: scheduleContext.reminderHours
        })

        return { text }
    }
}

export const documentsService = new DocumentsService()
