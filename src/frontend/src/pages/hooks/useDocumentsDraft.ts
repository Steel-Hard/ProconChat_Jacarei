import { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import isDocumentTaken from "@/utils/documents/isDocumentTaken"
import MAX_DOCUMENT_LENGTH from "@/utils/documents/maxDocumentLength"
import MAX_DOCUMENTS_PER_GROUP from "@/utils/documents/maxDocumentsPerGroup"
import type AttendeeGroup from "@/types/documents/AttendeeGroup.types"
import type DocumentsConfig from "@/types/documents/DocumentsConfig.types"
import type DocumentsDraftItem from "@/types/documents/DocumentsDraftItem.types"
import type DocumentsDraftState from "@/types/documents/DocumentsDraftState.types"

function itemsOf(texts: string[], prefix: string): DocumentsDraftItem[] {
    return texts.map((text, index) => ({ id: `${prefix}-${index}`, text }))
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
        representative: itemsOf(serverConfig?.representative ?? [], "representative"),
        log: []
    }
}

type GroupUpdate = { items: DocumentsDraftItem[]; entry: string } | null

export default function useDocumentsDraft(serverConfig: DocumentsConfig | null | undefined) {
    const { t } = useTranslation("documents")
    const [draft, setDraft] = useState<DocumentsDraftState | null>(null)

    const nextId = useRef(0)
    const baseState = useMemo(() => freshState(serverConfig), [serverConfig])
    const currentDraft = draft !== null && draft.serverConfig === serverConfig ? draft : baseState
    const holderItems = currentDraft.holder
    const representativeItems = currentDraft.representative
    const holder = useMemo(() => holderItems.map((item) => item.text), [holderItems])
    const representative = useMemo(
        () => representativeItems.map((item) => item.text),
        [representativeItems]
    )

    function updateGroup(
        group: AttendeeGroup,
        updater: (items: DocumentsDraftItem[]) => GroupUpdate
    ) {
        setDraft((previous) => {
            const base =
                previous !== null && previous.serverConfig === serverConfig ? previous : baseState
            const update = updater(group === "holder" ? base.holder : base.representative)
            if (update === null) return base
            const log = [...base.log, update.entry]
            return group === "holder"
                ? { ...base, holder: update.items, log }
                : { ...base, representative: update.items, log }
        })
    }

    function groupLabel(group: AttendeeGroup): string {
        return t(`changes.group.${group}`)
    }

    function addItem(group: AttendeeGroup, description: string) {
        const trimmed = description.trim()
        if (!trimmed || trimmed.length > MAX_DOCUMENT_LENGTH) return

        nextId.current += 1
        const id = `new-${nextId.current}`

        updateGroup(group, (prev) => {
            if (prev.length >= MAX_DOCUMENTS_PER_GROUP || isDocumentTaken(textsOf(prev), trimmed)) {
                return null
            }
            return {
                items: [...prev, { id, text: trimmed }],
                entry: t("changes.added", { item: trimmed, group: groupLabel(group) })
            }
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
            return {
                items: next,
                entry: t("changes.edited", {
                    from: prev[index]!.text,
                    to: trimmed,
                    group: groupLabel(group)
                })
            }
        })
    }

    function removeItem(group: AttendeeGroup, index: number) {
        updateGroup(group, (prev) => {
            if (index < 0 || index >= prev.length) return null
            return {
                items: prev.filter((_, i) => i !== index),
                entry: t("changes.removed", { item: prev[index]!.text, group: groupLabel(group) })
            }
        })
    }

    function swap(group: AttendeeGroup, index: number, target: number, direction: "up" | "down") {
        updateGroup(group, (prev) => {
            if (index < 0 || index >= prev.length || target < 0 || target >= prev.length) {
                return null
            }
            const next = [...prev]
            next[index] = prev[target]!
            next[target] = prev[index]!
            return {
                items: next,
                entry: t(`changes.moved.${direction}`, {
                    item: prev[index]!.text,
                    group: groupLabel(group)
                })
            }
        })
    }

    function moveUp(group: AttendeeGroup, index: number) {
        swap(group, index, index - 1, "up")
    }

    function moveDown(group: AttendeeGroup, index: number) {
        swap(group, index, index + 1, "down")
    }

    function discard() {
        setDraft(null)
    }

    const holderChanged = !sameList(holder, serverConfig?.holder ?? [])
    const representativeChanged = !sameList(representative, serverConfig?.representative ?? [])
    const changes = holderChanged || representativeChanged ? currentDraft.log : []

    return {
        holder,
        representative,
        holderItems,
        representativeItems,
        changes,
        hasChanges: changes.length > 0,
        holderChanged,
        representativeChanged,
        isHolderEmpty: holder.length === 0,
        isRepresentativeEmpty: representative.length === 0,
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
