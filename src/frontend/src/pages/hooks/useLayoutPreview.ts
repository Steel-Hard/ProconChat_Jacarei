import { useEffect, useRef, useState } from "react"
import type { LastChange } from "@/components/LastChangeNote"
import { useToast } from "@/hooks/useToast"
import accountSlice from "@/store/slices/account.slice"
import useAppDispatch from "@/store/useAppDispatch"
import useAppSelector from "@/store/useAppSelector"
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
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const dispatch = useAppDispatch()
    const currentAccount = useAppSelector((state) => state.account.current)
    const previousAccount = useRef(currentAccount)

    useEffect(() => {
        const previous = previousAccount.current
        dispatch(accountSlice.actions.accountLoaded(PREVIEW_ACCOUNT))

        return () => {
            dispatch(
                previous === null
                    ? accountSlice.actions.accountCleared()
                    : accountSlice.actions.accountLoaded(previous)
            )
        }
    }, [dispatch])

    useEffect(
        () => () => {
            if (saveTimer.current !== null) {
                clearTimeout(saveTimer.current)
            }
        },
        []
    )

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
        if (saveTimer.current !== null) {
            clearTimeout(saveTimer.current)
        }

        setSaving(true)
        saveTimer.current = setTimeout(() => {
            saveTimer.current = null
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
