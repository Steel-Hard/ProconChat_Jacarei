import {
    DocumentsConfigData,
    DocumentsLastChange,
    DocumentsSettingsContext,
    IDocumentsRepository,
    SampleQuestionRow
} from "../documents.repository.interface"

export class DocumentsStubRepository implements IDocumentsRepository {
    public config: DocumentsConfigData = {
        holder: ["RG", "CPF"],
        representative: ["RG do titular", "Procuração"]
    }
    public lastChange: DocumentsLastChange | null = {
        id: 1,
        name: "Admin",
        at: "2026-10-15T12:00:00.000Z"
    }
    public scheduleContext: DocumentsSettingsContext = {
        unitAddress: "Rua Central, 100",
        unitAddressComplement: null,
        reminderEnabled: true,
        reminderHours: 24
    }
    public sampleQuestions: SampleQuestionRow[] = [
        { id: "1", title: "Pergunta 1", documents: ["Doc P1"] }
    ]

    async getDocumentsConfig(): Promise<DocumentsConfigData> {
        return { ...this.config }
    }

    async getLastChange(): Promise<DocumentsLastChange | null> {
        return this.lastChange ? { ...this.lastChange } : null
    }

    async getScheduleContext(): Promise<DocumentsSettingsContext> {
        return { ...this.scheduleContext }
    }

    async getSampleQuestions(): Promise<SampleQuestionRow[]> {
        return [...this.sampleQuestions]
    }

    async getQuestionDocuments(questionId: number): Promise<string[]> {
        const found = this.sampleQuestions.find((q) => Number(q.id) === questionId)
        return found ? found.documents : []
    }

    async saveDocumentsConfig(data: DocumentsConfigData, actorUserId: number): Promise<void> {
        this.config = { ...data }
        this.lastChange = {
            id: actorUserId,
            name: "Usuário Teste",
            at: new Date().toISOString()
        }
    }
}
