import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import useToast from "@/hooks/useToast"
import useDocumentsDraft from "@/pages/hooks/useDocumentsDraft"
import documentsApi from "@/store/api/documents.api"
import type AttendeeGroup from "@/types/documents/AttendeeGroup.types"
import type SampleQuestion from "@/types/documents/SampleQuestion.types"
import type LastChange from "@/types/settings/LastChange.types"

const EMPTY_DOCS: string[] = []

export default function useDocuments() {
    const { t } = useTranslation(["documents", "common"])
    const { showToast } = useToast()

    const query = documentsApi.useGetDocumentsQuery()
    const [saveMutation, { isLoading: saving }] = documentsApi.useSaveDocumentsMutation()
    const [actionError, setActionError] = useState<string | null>(null)

    const view = query.data
    const draft = useDocumentsDraft(view)

    const sampleQuestions: SampleQuestion[] = useMemo(
        () => view?.sampleQuestions ?? [],
        [view?.sampleQuestions]
    )

    const [previewGroup, setPreviewGroup] = useState<AttendeeGroup>("holder")
    const [previewQuestionId, setPreviewQuestionId] = useState<string>("")

    const selectedQuestion = useMemo(() => {
        return sampleQuestions.find((q) => q.id === previewQuestionId) ?? sampleQuestions[0] ?? null
    }, [sampleQuestions, previewQuestionId])

    const activeGroupDocs = previewGroup === "holder" ? draft.holder : draft.representative
    const activeQuestionDocs = selectedQuestion?.documents ?? EMPTY_DOCS

    const confirmationQuery = documentsApi.usePreviewDocumentsQuery({
        byRepresentative: previewGroup === "representative",
        groupDocuments: activeGroupDocs,
        questionId: selectedQuestion === null ? undefined : Number(selectedQuestion.id)
    })
    const previewData = confirmationQuery.currentData ?? null

    const isPreviewUnsaved =
        previewGroup === "holder" ? draft.holderChanged : draft.representativeChanged
    const isQuestionEmpty = selectedQuestion !== null && activeQuestionDocs.length === 0

    const lastChange: LastChange | null =
        view?.updatedBy != null && view?.updatedAt != null
            ? { changedBy: view.updatedBy.name, changedAt: view.updatedAt }
            : null

    async function save() {
        setActionError(null)
        try {
            await saveMutation({
                holder: draft.holder,
                representative: draft.representative
            }).unwrap()
            showToast(t("saveToast"))
        } catch {
            setActionError(t("saveFailed"))
        }
    }

    return {
        status: query.isLoading ? "loading" : query.isError ? "error" : "success",
        view,
        draft,
        lastChange,
        saving,
        actionError,
        save,
        discard: draft.actions.discard,
        preview: {
            previewGroup,
            setPreviewGroup,
            previewQuestionId: selectedQuestion?.id ?? "",
            setPreviewQuestionId,
            sampleQuestions,
            selectedQuestion,
            previewData,
            confirmationError: confirmationQuery.isError,
            isPreviewUnsaved,
            isQuestionEmpty
        }
    }
}
