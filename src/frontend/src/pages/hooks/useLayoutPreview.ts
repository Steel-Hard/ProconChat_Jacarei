import { useEffect, useState } from "react"
import type { LastChange } from "@/components/LastChangeNote"
import { useToast } from "@/hooks/useToast"
import { clearAccount, setAccount } from "@/services/account.service"
import type { PanelAccount } from "@/types/account"

const PREVIEW_ACCOUNT: PanelAccount = {
    name: "Mariana Couto",
    email: "mariana.couto@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

const PREVIEW_CHANGE: LastChange = {
    changedBy: "Mariana Couto",
    changedAt: "2026-09-15T14:30:00-03:00"
}

const PREVIEW_CHANGES = ["Duração do atendimento", "Vagas por horário"]

type DialogTone = "primary" | "danger"

export function useLayoutPreview() {
    const { showToast } = useToast()
    const [dialogTone, setDialogTone] = useState<DialogTone | null>(null)
    const [changes, setChanges] = useState<string[]>(PREVIEW_CHANGES)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setAccount(PREVIEW_ACCOUNT)

        return () => {
            clearAccount()
        }
    }, [])

    function openDialog(tone: DialogTone) {
        setDialogTone(tone)
    }

    function closeDialog() {
        setDialogTone(null)
    }

    function confirmDialog() {
        setDialogTone(null)
        showToast("Ação confirmada.")
    }

    function discardChanges() {
        setChanges([])
        showToast("Alterações descartadas.")
    }

    function saveChanges() {
        setSaving(true)
        setTimeout(() => {
            setSaving(false)
            setChanges([])
            showToast("Alterações salvas.")
        }, 600)
    }

    function resetChanges() {
        setChanges(PREVIEW_CHANGES)
    }

    return {
        lastChange: PREVIEW_CHANGE,
        dialogTone,
        openDialog,
        closeDialog,
        confirmDialog,
        changes,
        saving,
        discardChanges,
        saveChanges,
        resetChanges,
        showToast
    }
}
