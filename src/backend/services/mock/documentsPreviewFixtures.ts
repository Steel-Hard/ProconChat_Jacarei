import { PreviewConfirmationArgs } from "../documents.service"

export interface DocumentsPreviewFixtureCase {
    file: string
    args: PreviewConfirmationArgs
    question: string[]
}

const holderGroup = ["RG ou outro documento oficial com foto", "CPF"]
const questionDocuments = ["RG", "Fatura do cartão"]

export const documentsPreviewFixtureCases: DocumentsPreviewFixtureCase[] = [
    {
        file: "documentsPreviewHolder.json",
        args: { byRepresentative: false, groupDocuments: holderGroup, questionId: 7 },
        question: questionDocuments
    },
    {
        file: "documentsPreviewRepresentative.json",
        args: { byRepresentative: true, groupDocuments: ["Procuração assinada"], questionId: 7 },
        question: questionDocuments
    },
    {
        file: "documentsPreviewWithoutQuestion.json",
        args: { byRepresentative: false, groupDocuments: holderGroup },
        question: questionDocuments
    }
]
