import { useState } from "react"
import { useTranslation } from "react-i18next"
import type AttendeeGroup from "@/types/documents/AttendeeGroup.types"
import type DocumentsConfig from "@/types/documents/DocumentsConfig.types"
import type DocumentsDraftState from "@/types/documents/DocumentsDraftState.types"

function sameList(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false
    return a.every((val, i) => val === b[i])
}

function freshState(serverConfig: DocumentsConfig | null | undefined): DocumentsDraftState {
    return {
        serverConfig,
        holder: serverConfig?.holder ?? [],
        representative: serverConfig?.representative ?? [],
        log: []
    }
}

type GroupUpdate = { items: string[]; entry: string } | null

export default function useDocumentsDraft(serverConfig: DocumentsConfig | null | undefined) {
    const { t } = useTranslation("documents")
    const [draft, setDraft] = useState<DocumentsDraftState | null>(null)

    const currentDraft =
        draft !== null && draft.serverConfig === serverConfig ? draft : freshState(serverConfig)
    const holder = currentDraft.holder
    const representative = currentDraft.representative

    function updateGroup(group: AttendeeGroup, updater: (items: string[]) => GroupUpdate) {
        setDraft((previous) => {
            const base =
                previous !== null && previous.serverConfig === serverConfig
                    ? previous
                    : freshState(serverConfig)
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
        if (!trimmed) return

        updateGroup(group, (prev) => ({
            items: [...prev, trimmed],
            entry: t("changes.added", { item: trimmed, group: groupLabel(group) })
        }))
    }

    function editItem(group: AttendeeGroup, index: number, newDescription: string) {
        const trimmed = newDescription.trim()
        if (!trimmed) return

        updateGroup(group, (prev) => {
            if (index < 0 || index >= prev.length) return null
            const next = [...prev]
            next[index] = trimmed
            return {
                items: next,
                entry: t("changes.edited", {
                    from: prev[index],
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
                entry: t("changes.removed", { item: prev[index], group: groupLabel(group) })
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
                    item: prev[index],
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
