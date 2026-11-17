import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { DocumentsStubRepository } from "../repositories/mock/documentsStub.repository"
import { createDocumentsService } from "./documents.service"
import { documentsPreviewFixtureCases } from "./mock/documentsPreviewFixtures"

const FRONTEND_FIXTURES_DIR = path.resolve(__dirname, "../../frontend/src/testUtils")
const REGENERATE = process.env.REGENERATE_PREVIEW_FIXTURES === "1"

describe("fixtures do frontend para a prévia de Documentos", () => {
    it.each(documentsPreviewFixtureCases)(
        "$file bate com a resposta real de previewConfirmation",
        async ({ file, args, question }) => {
            const repository = new DocumentsStubRepository()
            repository.scheduleContext = {
                unitAddress: "Avenida Central, 100",
                unitAddressComplement: "Térreo",
                reminderEnabled: true,
                reminderHours: 24
            }
            repository.sampleQuestions = [
                {
                    id: "7",
                    title: "Pergunta de exemplo",
                    categoryTitle: "Categoria de exemplo",
                    documents: question
                }
            ]
            const actual = await createDocumentsService({ documents: repository }).previewConfirmation(args)
            const target = path.join(FRONTEND_FIXTURES_DIR, file)

            if (REGENERATE) {
                writeFileSync(target, `${JSON.stringify(actual, null, 4)}\n`)
                return
            }

            expect(
                actual,
                `A fixture ${file} do frontend está diferente da resposta real da prévia. Se a mudança no backend foi intencional, regenere com "npm run fixtures:documents-preview" em src/backend e commite os JSON de src/frontend/src/testUtils junto.`
            ).toEqual(JSON.parse(readFileSync(target, "utf8")))
        }
    )
})
