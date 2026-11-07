import { useState } from "react"
import { useTranslation } from "react-i18next"
import type AttendeeGroup from "@/types/documents/AttendeeGroup.types"
import type DocumentsConfig from "@/types/documents/DocumentsConfig.types"

function sameList(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false
    return a.every((val, i) => val === b[i])
}

type DraftState = {
    serverConfig: DocumentsConfig | null | undefined
    holder: string[]
    representative: string[]
}

export default function useDocumentsDraft(serverConfig: DocumentsConfig | null | undefined) {
    const { t } = useTranslation("documents")
    const [draft, setDraft] = useState<DraftState | null>(null)

    const currentDraft =
        draft !== null && draft.serverConfig === serverConfig
            ? draft
            : {
                  serverConfig,
                  holder: serverConfig?.holder ?? [],
                  representative: serverConfig?.representative ?? []
              }
    const holder = currentDraft.holder
    const representative = currentDraft.representative

    function updateGroup(group: AttendeeGroup, updater: (items: string[]) => string[]) {
        setDraft((previous) => {
            const base =
                previous !== null && previous.serverConfig === serverConfig
                    ? previous
                    : {
                          serverConfig,
                          holder: serverConfig?.holder ?? [],
                          representative: serverConfig?.representative ?? []
                      }
            return group === "holder"
                ? { ...base, holder: updater(base.holder) }
                : { ...base, representative: updater(base.representative) }
        })
    }

    function addItem(group: AttendeeGroup, description: string) {
        const trimmed = description.trim()
        if (!trimmed) return

        updateGroup(group, (prev) => [...prev, trimmed])
    }

    function editItem(group: AttendeeGroup, index: number, newDescription: string) {
        const trimmed = newDescription.trim()
        if (!trimmed) return

        const updater = (prev: string[]) => {
            if (index < 0 || index >= prev.length) return prev
            const next = [...prev]
            next[index] = trimmed
            return next
        }

        updateGroup(group, updater)
    }

    function removeItem(group: AttendeeGroup, index: number) {
        const updater = (prev: string[]) => {
            if (index < 0 || index >= prev.length) return prev
            return prev.filter((_, i) => i !== index)
        }

        updateGroup(group, updater)
    }

    function moveUp(group: AttendeeGroup, index: number) {
        if (index <= 0) return

        const updater = (prev: string[]) => {
            if (index >= prev.length) return prev
            const next = [...prev]
            const temp = next[index - 1]!
            next[index - 1] = next[index]!
            next[index] = temp
            return next
        }

        updateGroup(group, updater)
    }

    function moveDown(group: AttendeeGroup, index: number) {
        const updater = (prev: string[]) => {
            if (index < 0 || index >= prev.length - 1) return prev
            const next = [...prev]
            const temp = next[index + 1]!
            next[index + 1] = next[index]!
            next[index] = temp
            return next
        }

        updateGroup(group, updater)
    }

    function discard() {
        setDraft(null)
    }

    const holderChanged = !sameList(holder, serverConfig?.holder ?? [])
    const representativeChanged = !sameList(representative, serverConfig?.representative ?? [])

    const changes: string[] = []
    if (holderChanged) {
        changes.push(t("changes.holderGroup"))
    }
    if (representativeChanged) {
        changes.push(t("changes.representativeGroup"))
    }

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
