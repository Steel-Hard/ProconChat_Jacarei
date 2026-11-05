import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type AttendeeGroup from "@/types/documents/AttendeeGroup.types"
import type DocumentsConfig from "@/types/documents/DocumentsConfig.types"

function sameList(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false
    return a.every((val, i) => val === b[i])
}

export function useDocumentsDraft(serverConfig: DocumentsConfig | null | undefined) {
    const { t } = useTranslation("documents")
    const initialHolder = serverConfig?.holder ?? []
    const initialRepresentative = serverConfig?.representative ?? []

    const [holder, setHolder] = useState<string[]>(initialHolder)
    const [representative, setRepresentative] = useState<string[]>(initialRepresentative)

    useEffect(() => {
        if (serverConfig) {
            setHolder(serverConfig.holder)
            setRepresentative(serverConfig.representative)
        }
    }, [serverConfig])

    function addItem(group: AttendeeGroup, description: string) {
        const trimmed = description.trim()
        if (!trimmed) return

        if (group === "holder") {
            setHolder((prev) => [...prev, trimmed])
        } else {
            setRepresentative((prev) => [...prev, trimmed])
        }
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

        if (group === "holder") {
            setHolder(updater)
        } else {
            setRepresentative(updater)
        }
    }

    function removeItem(group: AttendeeGroup, index: number) {
        const updater = (prev: string[]) => {
            if (index < 0 || index >= prev.length) return prev
            return prev.filter((_, i) => i !== index)
        }

        if (group === "holder") {
            setHolder(updater)
        } else {
            setRepresentative(updater)
        }
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

        if (group === "holder") {
            setHolder(updater)
        } else {
            setRepresentative(updater)
        }
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

        if (group === "holder") {
            setHolder(updater)
        } else {
            setRepresentative(updater)
        }
    }

    function discard() {
        setHolder(serverConfig?.holder ?? [])
        setRepresentative(serverConfig?.representative ?? [])
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

export default useDocumentsDraft
