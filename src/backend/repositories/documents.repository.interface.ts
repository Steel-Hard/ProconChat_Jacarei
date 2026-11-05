export interface SampleQuestionRow {
    id: string
    title: string
    documents: string[]
}

export interface DocumentsConfigData {
    holder: string[]
    representative: string[]
}

export interface DocumentsSettingsContext {
    unitAddress: string
    unitAddressComplement: string | null
    reminderEnabled: boolean
    reminderHours: number
}

export interface DocumentsLastChange {
    id: number
    name: string
    at: string
}

export interface IDocumentsRepository {
    getDocumentsConfig(): Promise<DocumentsConfigData>
    getLastChange(): Promise<DocumentsLastChange | null>
    getScheduleContext(): Promise<DocumentsSettingsContext>
    getSampleQuestions(): Promise<SampleQuestionRow[]>
    getQuestionDocuments(questionId: number): Promise<string[]>
    saveDocumentsConfig(
        data: DocumentsConfigData,
        actorUserId: number
    ): Promise<void>
}
