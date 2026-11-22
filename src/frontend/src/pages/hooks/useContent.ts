import { useMemo, useState } from "react"
import { skipToken } from "@reduxjs/toolkit/query/react"
import { useTranslation } from "react-i18next"
import useDebouncedValue from "@/hooks/useDebouncedValue"
import useToast from "@/hooks/useToast"
import useContentSave from "@/pages/hooks/useContentSave"
import contentApi from "@/store/api/content.api"
import type ContentActionError from "@/types/content/ContentActionError.types"
import type ContentCategoryFormFields from "@/types/content/ContentCategoryFormFields.types"
import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"
import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type ContentFormDialogState from "@/types/content/ContentFormDialogState.types"
import type ContentPreviewState from "@/types/content/ContentPreviewState.types"
import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"
import type ContentSaveOutcome from "@/types/content/ContentSaveOutcome.types"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"
import buildCategoryRows from "@/utils/content/buildCategoryRows"
import buildContentSavePlan from "@/utils/content/buildContentSavePlan"
import buildLocalPreviewList from "@/utils/content/buildLocalPreviewList"
import buildPreviewArgs from "@/utils/content/buildPreviewArgs"
import buildPreviewListRows from "@/utils/content/buildPreviewListRows"
import buildPreviewModel from "@/utils/content/buildPreviewModel"
import buildQuestionRows from "@/utils/content/buildQuestionRows"
import contentChangesOf from "@/utils/content/contentChanges"
import addDraftCategory from "@/utils/content/draft/addDraftCategory"
import addDraftQuestion from "@/utils/content/draft/addDraftQuestion"
import applyCreatedIds from "@/utils/content/draft/applyCreatedIds"
import deriveContentDraft from "@/utils/content/draft/deriveContentDraft"
import moveDraftCategory from "@/utils/content/draft/moveDraftCategory"
import moveDraftQuestion from "@/utils/content/draft/moveDraftQuestion"
import reapplyDraftOnSnapshot from "@/utils/content/draft/reapplyDraftOnSnapshot"
import setDraftCategoryActive from "@/utils/content/draft/setDraftCategoryActive"
import setDraftQuestionActive from "@/utils/content/draft/setDraftQuestionActive"
import updateDraftCategory from "@/utils/content/draft/updateDraftCategory"
import updateDraftQuestion from "@/utils/content/draft/updateDraftQuestion"
import invalidContentKeys from "@/utils/content/invalidContentKeys"
import labelContentChange from "@/utils/content/labelContentChange"
import latestContentChange from "@/utils/content/latestContentChange"
import searchContentQuestions from "@/utils/content/searchContentQuestions"
import validateCategoryDraft from "@/utils/content/validateCategoryDraft"
import validateQuestionDraft from "@/utils/content/validateQuestionDraft"
import PREVIEW_DEBOUNCE_MS from "@/utils/documents/previewDebounceMs"

const EMPTY_SET: ReadonlySet<string> = new Set()

function draftQuestionOfFields(
    fields: ContentQuestionFormFields,
    categoryKey: string,
    key: string
): ContentDraftQuestion {
    return { ...fields, key, id: null, categoryKey, updatedBy: null, updatedAt: null }
}

function isForbidden(error: unknown): boolean {
    return typeof error === "object" && error !== null && "status" in error && error.status === 403
}

export default function useContent() {
    const { t } = useTranslation("content")
    const { showToast } = useToast()
    const query = contentApi.useGetContentSnapshotQuery()
    const { saving, save: runSave, reload } = useContentSave()
    const snapshot: ContentSnapshot | undefined = query.data
    const baseDraft = useMemo(() => (snapshot ? deriveContentDraft(snapshot) : null), [snapshot])
    const [edited, setEdited] = useState<ContentDraftState | null>(null)
    const [selectedKey, setSelectedKey] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [dialog, setDialog] = useState<ContentFormDialogState | null>(null)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [formFields, setFormFields] = useState<ContentQuestionFormFields | null>(null)
    const [actionError, setActionError] = useState<ContentActionError | null>(null)
    const [invalidKeys, setInvalidKeys] = useState<ReadonlySet<string>>(EMPTY_SET)
    const [itemErrors, setItemErrors] = useState<Record<string, string>>({})
    const [needsReload, setNeedsReload] = useState(false)
    const [reloading, setReloading] = useState(false)
    const draft = edited ?? baseDraft

    function update(change: (current: ContentDraftState) => ContentDraftState) {
        const current = edited ?? baseDraft

        if (current === null) {
            return
        }

        setEdited(change(current))
        setInvalidKeys(EMPTY_SET)
        setItemErrors({})
    }

    const effectiveSelectedKey =
        draft === null
            ? null
            : draft.categories.some((category) => category.key === selectedKey)
              ? selectedKey
              : (draft.categories[0]?.key ?? null)
    const searching = searchTerm.trim() !== ""

    const changes = useMemo(
        () =>
            draft && snapshot
                ? contentChangesOf(draft, snapshot).map((change) => labelContentChange(change, t))
                : [],
        [draft, snapshot, t]
    )

    const categoryRows = useMemo(
        () =>
            draft && snapshot
                ? buildCategoryRows(draft, snapshot, effectiveSelectedKey, invalidKeys, itemErrors)
                : [],
        [draft, snapshot, effectiveSelectedKey, invalidKeys, itemErrors]
    )

    const questionRows = useMemo(() => {
        if (!draft || !snapshot) {
            return []
        }

        const entries = searching
            ? searchContentQuestions(draft, searchTerm)
            : draft.categories
                  .filter((category) => category.key === effectiveSelectedKey)
                  .flatMap((category) =>
                      (draft.questionsByCategory[category.key] ?? []).map((question) => ({
                          question,
                          category
                      }))
                  )

        return buildQuestionRows(draft, snapshot, entries, searching, invalidKeys, itemErrors)
    }, [draft, snapshot, searching, searchTerm, effectiveSelectedKey, invalidKeys, itemErrors])

    const selectedCategory =
        draft?.categories.find((category) => category.key === effectiveSelectedKey) ?? null

    function openDialog(next: ContentFormDialogState) {
        setDialog(next)
        setPreviewOpen(false)
        setFormFields(null)
    }

    function closeDialog() {
        setDialog(null)
        setPreviewOpen(false)
        setFormFields(null)
    }

    const categoryDialogCategory =
        dialog?.kind === "category" && dialog.mode === "edit"
            ? (draft?.categories.find((category) => category.key === dialog.categoryKey) ?? null)
            : null

    const categoryFormInitial: ContentCategoryFormFields = categoryDialogCategory
        ? {
              title: categoryDialogCategory.title,
              shortTitle: categoryDialogCategory.shortTitle,
              description: categoryDialogCategory.description
          }
        : { title: "", shortTitle: "", description: "" }

    const dialogQuestion =
        dialog?.kind === "question" && dialog.mode === "edit" && draft
            ? ((draft.questionsByCategory[dialog.categoryKey] ?? []).find(
                  (question) => question.key === dialog.questionKey
              ) ?? null)
            : null

    const questionFormInitial: ContentQuestionFormFields = dialogQuestion
        ? {
              shortTitle: dialogQuestion.shortTitle,
              shortDescription: dialogQuestion.shortDescription,
              question: dialogQuestion.question,
              answer: dialogQuestion.answer,
              legalBasis: dialogQuestion.legalBasis,
              requiredDocuments: dialogQuestion.requiredDocuments,
              requiresInPerson: dialogQuestion.requiresInPerson,
              inPersonNote: dialogQuestion.inPersonNote,
              outOfScope: dialogQuestion.outOfScope,
              llmAllowed: dialogQuestion.llmAllowed,
              active: dialogQuestion.active
          }
        : {
              shortTitle: "",
              shortDescription: "",
              question: "",
              answer: "",
              legalBasis: "",
              requiredDocuments: [],
              requiresInPerson: false,
              inPersonNote: "",
              outOfScope: false,
              llmAllowed: true,
              active: true
          }

    function validateCategoryFields(fields: ContentCategoryFormFields) {
        const key = categoryDialogCategory?.key ?? ""
        const others = (draft?.categories ?? []).map(({ key: otherKey, title }) => ({
            key: otherKey,
            title
        }))

        return validateCategoryDraft({ ...fields, key }, others).errors
    }

    function validateQuestionFields(fields: ContentQuestionFormFields) {
        return validateQuestionDraft(
            draftQuestionOfFields(fields, dialogQuestion?.categoryKey ?? "", "form")
        )
    }

    function confirmCategory(fields: ContentCategoryFormFields) {
        if (dialog?.kind !== "category") {
            return
        }

        if (dialog.mode === "edit") {
            update((current) => updateDraftCategory(current, dialog.categoryKey, fields))
        } else if (draft) {
            const next = addDraftCategory(draft, fields)
            update(() => next)
            setSelectedKey(next.categories[next.categories.length - 1].key)
        }

        closeDialog()
    }

    function confirmQuestion(fields: ContentQuestionFormFields) {
        if (dialog?.kind !== "question") {
            return
        }

        if (dialog.mode === "edit") {
            update((current) =>
                updateDraftQuestion(current, dialog.categoryKey, dialog.questionKey, fields)
            )
        } else {
            update((current) => addDraftQuestion(current, dialog.categoryKey, fields))
        }

        closeDialog()
    }

    const previewCategory =
        dialog?.kind === "question"
            ? (draft?.categories.find((category) => category.key === dialog.categoryKey) ?? null)
            : null
    const previewFieldsValid = formFields !== null && validateQuestionFields(formFields).valid
    const previewListRows = useMemo(
        () =>
            previewOpen && draft && dialog?.kind === "question" && formFields
                ? buildPreviewListRows(draft, dialog.categoryKey, {
                      key: dialog.mode === "edit" ? dialog.questionKey : null,
                      shortTitle: formFields.shortTitle,
                      shortDescription: formFields.shortDescription
                  })
                : null,
        [previewOpen, draft, dialog, formFields]
    )
    const previewArgs = useMemo(
        () =>
            previewOpen &&
            previewCategory !== null &&
            previewCategory.id !== null &&
            formFields !== null &&
            previewFieldsValid &&
            previewListRows !== null
                ? buildPreviewArgs(
                      previewCategory.id,
                      dialogQuestion?.id ?? null,
                      formFields,
                      previewListRows
                  )
                : skipToken,
        [
            previewOpen,
            previewCategory,
            formFields,
            previewFieldsValid,
            previewListRows,
            dialogQuestion
        ]
    )
    const debouncedArgs = useDebouncedValue(
        previewArgs,
        PREVIEW_DEBOUNCE_MS,
        (current) => current === skipToken
    )
    const previewQuery = contentApi.usePreviewContentQuestionQuery(debouncedArgs)

    function previewStateOf(): ContentPreviewState | null {
        if (!previewOpen || previewCategory === null) {
            return null
        }

        if (previewCategory.id === null) {
            return {
                status: "unsaved",
                model: {
                    list: buildLocalPreviewList(previewListRows ?? []),
                    primaryBubbles: [],
                    fallbackBubbles: [],
                    lengthWarning: null
                }
            }
        }

        if (!previewFieldsValid) {
            return { status: "invalid", model: null }
        }

        if (previewQuery.isError) {
            return { status: "error", model: null }
        }

        if (!previewQuery.data) {
            return { status: "loading", model: null }
        }

        return {
            status: previewQuery.isFetching || debouncedArgs !== previewArgs ? "updating" : "ready",
            model: buildPreviewModel(previewQuery.data)
        }
    }

    const preview = previewStateOf()

    function nameOfStep(failure: NonNullable<ContentSaveOutcome["failure"]>): string | null {
        const step = failure.step

        if (!draft) {
            return null
        }

        if ("categoryKey" in step && !("questionKey" in step) && step.kind !== "reorderQuestions") {
            return (
                draft.categories.find((item) => item.key === step.categoryKey)?.shortTitle ?? null
            )
        }

        if ("questionKey" in step) {
            for (const questions of Object.values(draft.questionsByCategory)) {
                const found = questions.find((item) => item.key === step.questionKey)

                if (found) {
                    return found.shortTitle
                }
            }
        }

        return null
    }

    function failureFeedback(
        outcome: ContentSaveOutcome,
        nextDraft: ContentDraftState,
        before: number
    ): ContentActionError {
        const failure = outcome.failure
        const details: string[] = []

        if (failure === null) {
            return { message: t("saveFailedFirst"), details, tone: "error" }
        }

        const name = nameOfStep(failure)

        if (name !== null) {
            details.push(t("saveFailedItem", { item: name }))
        }

        if (failure.kind === "forbidden") {
            return { message: t("saveForbidden"), details: [], tone: "error" }
        }

        if (failure.kind === "duplicateName") {
            details.push(t("duplicateCategoryName"))
        } else if (failure.kind === "reorderRefused") {
            details.push(t("reorderRefused"))
        } else if (failure.message) {
            details.push(failure.message)
        }

        if (outcome.completed === 0) {
            return { message: t("saveFailedFirst"), details, tone: "error" }
        }

        const pending = outcome.snapshot
            ? contentChangesOf(nextDraft, outcome.snapshot).length
            : null
        const saved = pending === null ? null : Math.max(before - pending, 0)

        if (saved !== null && pending !== null) {
            details.unshift(t("saveProgress", { saved, pending }))
        }

        return { message: t("saveFailedPartial"), details, tone: "warning" }
    }

    async function save() {
        if (!draft || !snapshot || saving || reloading) {
            return
        }

        setActionError(null)
        const invalid = invalidContentKeys(draft)

        if (invalid.keys.size > 0) {
            setInvalidKeys(invalid.keys)
            setActionError({
                message: t("saveInvalid"),
                details:
                    invalid.first === null ? [] : [t("saveFailedItem", { item: invalid.first })],
                tone: "error"
            })
            return
        }

        let base = snapshot
        let working = draft

        if (needsReload) {
            setReloading(true)
            const fresh = await reload()
            setReloading(false)

            if (fresh === null) {
                setActionError({ message: t("saveReloadFailed"), details: [], tone: "error" })
                return
            }

            base = fresh
            working = reapplyDraftOnSnapshot(draft, fresh)
            setNeedsReload(false)
            setEdited(working)
        }

        const plan = buildContentSavePlan(base, working)

        if (plan.length === 0) {
            if (base !== snapshot) {
                setEdited(null)
                showToast(t("saveToast"))
            }

            return
        }

        const before = contentChangesOf(working, base).length
        const selectedBefore = effectiveSelectedKey
        const outcome = await runSave(plan)

        if (outcome === null) {
            return
        }

        if (selectedBefore !== null && selectedBefore in outcome.idMap) {
            setSelectedKey(String(outcome.idMap[selectedBefore]))
        }

        if (outcome.snapshot === null && outcome.completed > 0) {
            setNeedsReload(true)
        }

        if (outcome.failure === null && outcome.snapshot === null) {
            setEdited(applyCreatedIds(working, outcome.idMap))
            setItemErrors({})
            showToast(t("saveToast"))
            setActionError({ message: t("saveReloadFailed"), details: [], tone: "warning" })
            return
        }

        if (outcome.failure === null) {
            setEdited(null)
            setItemErrors({})
            showToast(t("saveToast"))
            return
        }

        const withIds = applyCreatedIds(working, outcome.idMap)
        const nextDraft = outcome.snapshot
            ? reapplyDraftOnSnapshot(withIds, outcome.snapshot)
            : withIds

        setEdited(nextDraft)
        setActionError(failureFeedback(outcome, nextDraft, before))

        const name = nameOfStep(outcome.failure)
        const step = outcome.failure.step
        const failedKey =
            "questionKey" in step
                ? step.questionKey
                : "categoryKey" in step && step.kind !== "reorderQuestions"
                  ? step.categoryKey
                  : null

        if (name !== null && failedKey !== null) {
            setItemErrors({
                [failedKey in outcome.idMap ? String(outcome.idMap[failedKey]) : failedKey]:
                    outcome.failure.kind === "duplicateName"
                        ? t("duplicateCategoryName")
                        : (outcome.failure.message ?? name)
            })
        }
    }

    function discard() {
        if (needsReload) {
            void reload().then((fresh) => {
                if (fresh !== null) {
                    setNeedsReload(false)
                }
            })
        }

        setEdited(null)
        setInvalidKeys(EMPTY_SET)
        setItemErrors({})
        setActionError(null)
    }

    return {
        status: query.isLoading ? "loading" : !draft ? "error" : "success",
        loadForbidden: !draft && isForbidden(query.error),
        saving: saving || reloading,
        actionError,
        changes,
        lastChange: draft ? latestContentChange(draft) : null,
        categoryRows,
        questionRows,
        selectedCategory,
        searching,
        searchTerm,
        setSearchTerm,
        selectCategory: setSelectedKey,
        toggleCategory: (key: string) => {
            const category = draft?.categories.find((item) => item.key === key)

            if (category) {
                update((current) => setDraftCategoryActive(current, key, !category.active))
            }
        },
        toggleQuestion: (categoryKey: string, key: string) => {
            const question = draft?.questionsByCategory[categoryKey]?.find(
                (item) => item.key === key
            )

            if (question) {
                update((current) =>
                    setDraftQuestionActive(current, categoryKey, key, !question.active)
                )
            }
        },
        moveCategory: (key: string, direction: "up" | "down") =>
            update((current) => moveDraftCategory(current, key, direction)),
        moveQuestion: (categoryKey: string, key: string, direction: "up" | "down") =>
            update((current) => moveDraftQuestion(current, categoryKey, key, direction)),
        dialog,
        openNewCategory: () => openDialog({ kind: "category", mode: "new" }),
        openEditCategory: (categoryKey: string) =>
            openDialog({ kind: "category", mode: "edit", categoryKey }),
        openNewQuestion: () => {
            if (effectiveSelectedKey !== null) {
                openDialog({ kind: "question", mode: "new", categoryKey: effectiveSelectedKey })
            }
        },
        openEditQuestion: (categoryKey: string, questionKey: string) =>
            openDialog({ kind: "question", mode: "edit", categoryKey, questionKey }),
        closeDialog,
        categoryFormInitial,
        questionFormInitial,
        dialogQuestion,
        dialogCategory: previewCategory,
        validateCategoryFields,
        validateQuestionFields,
        confirmCategory,
        confirmQuestion,
        preview,
        openPreview: () => setPreviewOpen(true),
        closePreview: () => setPreviewOpen(false),
        changeFormFields: setFormFields,
        retryPreview: () => void previewQuery.refetch(),
        save,
        discard
    }
}
