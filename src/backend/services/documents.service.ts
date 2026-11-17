import NotFoundError from "../errors/NotFoundError"
import { documentsRepository } from "../repositories/documents.repository"
import { IDocumentsRepository } from "../repositories/documents.repository.interface"
import {
    ConfirmacaoAgendamentoEstrutura,
    formatarConfirmacaoAgendamento,
    montarConfirmacaoAgendamento
} from "./messageFormatter.service"

const EXAMPLE_PROTOCOL = "A3F9C21B"
const EXAMPLE_DATE_TIME = "Ter, 10/11 às 14:00"

export interface DocumentsViewOutput {
    holder: string[]
    representative: string[]
    updatedBy: { id: number | null; name: string } | null
    updatedAt: string | null
    unitAddress: string
    unitAddressComplement: string | null
    reminderEnabled: boolean
    reminderHours: number
    sampleQuestions: Array<{
        id: string
        title: string
        categoryTitle: string
        documents: string[]
    }>
}

export interface PreviewConfirmationArgs {
    byRepresentative: boolean
    groupDocuments: string[]
    questionId?: number
}

export interface PreviewConfirmationOutput extends ConfirmacaoAgendamentoEstrutura {
    text: string
    example: { protocol: string; dateTime: string }
}

export interface DocumentsService {
    getDocumentsView(): Promise<DocumentsViewOutput>
    saveDocuments(
        data: { holder: string[]; representative: string[] },
        actorUserId: number
    ): Promise<DocumentsViewOutput>
    previewConfirmation(args: PreviewConfirmationArgs): Promise<PreviewConfirmationOutput>
}

export function createDocumentsService(deps: {
    documents: IDocumentsRepository
}): DocumentsService {
    const repository = deps.documents

    async function getDocumentsView(): Promise<DocumentsViewOutput> {
        const [config, lastChange, scheduleContext, sampleQuestions] = await Promise.all([
            repository.getDocumentsConfig(),
            repository.getLastChange(),
            repository.getScheduleContext(),
            repository.getSampleQuestions()
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

    async function saveDocuments(
        data: { holder: string[]; representative: string[] },
        actorUserId: number
    ): Promise<DocumentsViewOutput> {
        await repository.saveDocumentsConfig(data, actorUserId)
        return getDocumentsView()
    }

    async function previewConfirmation(
        args: PreviewConfirmationArgs
    ): Promise<PreviewConfirmationOutput> {
        const scheduleContext = await repository.getScheduleContext()
        let questionDocuments: string[] = []

        if (args.questionId !== undefined) {
            const found = await repository.getQuestionDocuments(args.questionId)
            if (found === null) {
                throw new NotFoundError("Pergunta não encontrada.")
            }
            questionDocuments = found
        }

        const input = {
            protocol: EXAMPLE_PROTOCOL,
            quando: EXAMPLE_DATE_TIME,
            unitAddress: scheduleContext.unitAddress,
            unitAddressComplement: scheduleContext.unitAddressComplement,
            byRepresentative: args.byRepresentative,
            groupDocuments: args.groupDocuments,
            questionDocuments,
            reminderEnabled: scheduleContext.reminderEnabled,
            reminderHours: scheduleContext.reminderHours
        }

        return {
            text: formatarConfirmacaoAgendamento(input),
            example: { protocol: EXAMPLE_PROTOCOL, dateTime: EXAMPLE_DATE_TIME },
            ...montarConfirmacaoAgendamento(input)
        }
    }

    return { getDocumentsView, saveDocuments, previewConfirmation }
}

export const documentsService = createDocumentsService({ documents: documentsRepository })
