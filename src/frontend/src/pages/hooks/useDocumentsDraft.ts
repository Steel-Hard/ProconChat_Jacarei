import { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import isDocumentTaken from "@/utils/documents/isDocumentTaken"
import MAX_DOCUMENT_LENGTH from "@/utils/documents/maxDocumentLength"
import MAX_DOCUMENTS_PER_GROUP from "@/utils/documents/maxDocumentsPerGroup"
import type AttendeeGroup from "@/types/documents/AttendeeGroup.types"
import type DocumentsConfig from "@/types/documents/DocumentsConfig.types"
import type DocumentsDraftItem from "@/types/documents/DocumentsDraftItem.types"
import type DocumentsDraftState from "@/types/documents/DocumentsDraftState.types"

const NEW_ITEM_PREFIX = "new-"

function itemsOf(texts: string[], group: AttendeeGroup): DocumentsDraftItem[] {
    return texts.map((text, index) => ({ id: `${group}-${index}`, text }))
}

function textsOf(items: DocumentsDraftItem[]): string[] {
    return items.map((item) => item.text)
}

function sameList(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false
    return a.every((val, i) => val === b[i])
}

function freshState(serverConfig: DocumentsConfig | null | undefined): DocumentsDraftState {
    return {
        serverConfig,
        holder: itemsOf(serverConfig?.holder ?? [], "holder"),
        representative: itemsOf(serverConfig?.representative ?? [], "representative")
    }
}

export default function useDocumentsDraft(serverConfig: DocumentsConfig | null | undefined) {
    const { t } = useTranslation("documents")
    const [draft, setDraft] = useState<DocumentsDraftState | null>(null)

    const nextId = useRef(0)
    const baseState = useMemo(() => freshState(serverConfig), [serverConfig])
    const currentDraft = draft !== null && draft.serverConfig === serverConfig ? draft : baseState
    const holderItems = currentDraft.holder
    const representativeItems = currentDraft.representative
    const holder = useMemo(() => textsOf(holderItems), [holderItems])
    const representative = useMemo(() => textsOf(representativeItems), [representativeItems])

    function updateGroup(
        group: AttendeeGroup,
        updater: (items: DocumentsDraftItem[]) => DocumentsDraftItem[] | null
    ) {
        setDraft((previous) => {
            const base =
                previous !== null && previous.serverConfig === serverConfig ? previous : baseState
            const next = updater(group === "holder" ? base.holder : base.representative)
            if (next === null) return base
            return group === "holder"
                ? { ...base, holder: next }
                : { ...base, representative: next }
        })
    }

    function changesOf(
        group: AttendeeGroup,
        items: DocumentsDraftItem[],
        serverTexts: string[]
    ): string[] {
        if (sameList(textsOf(items), serverTexts)) return []

        const label = t(`changes.group.${group}`)
        const present = new Set(items.map((item) => item.id))
        const entries: string[] = []

        for (const item of items) {
            if (item.id.startsWith(NEW_ITEM_PREFIX)) {
                entries.push(t("changes.added", { item: item.text, group: label }))
            }
        }

        serverTexts.forEach((text, index) => {
            if (!present.has(`${group}-${index}`)) {
                entries.push(t("changes.removed", { item: text, group: label }))
            }
        })

        const surviving: number[] = []
        for (const item of items) {
            if (item.id.startsWith(NEW_ITEM_PREFIX)) continue
            const index = Number(item.id.slice(group.length + 1))
            surviving.push(index)
            if (item.text !== serverTexts[index]) {
                entries.push(
                    t("changes.edited", { from: serverTexts[index], to: item.text, group: label })
                )
            }
        }

        if (surviving.some((index, position) => position > 0 && index < surviving[position - 1]!)) {
            entries.push(t("changes.reordered", { group: label }))
        }

        return entries
    }

    function addItem(group: AttendeeGroup, description: string) {
        const trimmed = description.trim()
        if (!trimmed || trimmed.length > MAX_DOCUMENT_LENGTH) return

        nextId.current += 1
        const id = `${NEW_ITEM_PREFIX}${nextId.current}`

        updateGroup(group, (prev) => {
            if (prev.length >= MAX_DOCUMENTS_PER_GROUP || isDocumentTaken(textsOf(prev), trimmed)) {
                return null
            }
            return [...prev, { id, text: trimmed }]
        })
    }

    function editItem(group: AttendeeGroup, index: number, newDescription: string) {
        const trimmed = newDescription.trim()
        if (!trimmed || trimmed.length > MAX_DOCUMENT_LENGTH) return

        updateGroup(group, (prev) => {
            if (
                index < 0 ||
                index >= prev.length ||
                isDocumentTaken(textsOf(prev), trimmed, index)
            ) {
                return null
            }
            const next = [...prev]
            next[index] = { id: prev[index]!.id, text: trimmed }
            return next
        })
    }

    function removeItem(group: AttendeeGroup, index: number) {
        updateGroup(group, (prev) => {
            if (index < 0 || index >= prev.length) return null
            return prev.filter((_, i) => i !== index)
        })
    }

    function swap(group: AttendeeGroup, index: number, target: number) {
        updateGroup(group, (prev) => {
            if (index < 0 || index >= prev.length || target < 0 || target >= prev.length) {
                return null
            }
            const next = [...prev]
            next[index] = prev[target]!
            next[target] = prev[index]!
            return next
        })
    }

    function moveUp(group: AttendeeGroup, index: number) {
        swap(group, index, index - 1)
    }

    function moveDown(group: AttendeeGroup, index: number) {
        swap(group, index, index + 1)
    }

    function discard() {
        setDraft(null)
    }

    const holderChanged = !sameList(holder, serverConfig?.holder ?? [])
    const representativeChanged = !sameList(representative, serverConfig?.representative ?? [])
    const changes = [
        ...changesOf("holder", holderItems, serverConfig?.holder ?? []),
        ...changesOf("representative", representativeItems, serverConfig?.representative ?? [])
    ]

    return {
        holder,
        representative,
        holderItems,
        representativeItems,
        changes,
        holderChanged,
        representativeChanged,
        actions: {
            addItem,
            editItem,
            removeItem,
            moveUp,
            moveDown,
            discard
        }
    }
}
