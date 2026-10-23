import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import useToast from "@/hooks/useToast"
import usersApi from "@/store/api/users.api"
import useAppDispatch from "@/store/useAppDispatch"
import type PermissionKey from "@/types/account/PermissionKey.types"
import type CapacityLossReason from "@/types/users/CapacityLossReason.types"
import type Reassignment from "@/types/users/Reassignment.types"
import type ReassignmentRequest from "@/types/users/ReassignmentRequest.types"
import type UserAccount from "@/types/users/UserAccount.types"
import type UserApiError from "@/types/users/UserApiError.types"
import type UserDraft from "@/types/users/UserDraft.types"
import type UserDraftEntry from "@/types/users/UserDraftEntry.types"
import userApiErrorOf from "@/utils/userApiErrorOf"
import applyPermissionToggle from "@/utils/users/applyPermissionToggle"
import buildAccountBatch from "@/utils/users/buildAccountBatch"
import capacityLossReason from "@/utils/users/capacityLossReason"
import effectiveAccounts from "@/utils/users/effectiveAccounts"
import pruneReassignments from "@/utils/users/pruneReassignments"
import updateDraftEntry from "@/utils/users/updateDraftEntry"

type Options = {
    saved: UserAccount[]
    onSelect: (userId: number) => void
}

function useUserDraft({ saved, onSelect }: Options) {
    const { t } = useTranslation(["users", "common"])
    const { showToast } = useToast()
    const dispatch = useAppDispatch()
    const [saveChanges] = usersApi.useSaveUserChangesMutation()
    const [draft, setDraft] = useState<UserDraft>({})
    const [reassignment, setReassignment] = useState<ReassignmentRequest | null>(null)
    const [actionError, setActionError] = useState<UserApiError | null>(null)
    const [saving, setSaving] = useState(false)
    const saveInFlight = useRef(false)
    const checkInFlight = useRef(false)
    const revision = useRef(0)

    const effective = effectiveAccounts(saved, draft)

    function nameOf(userId: number | undefined): string {
        return saved.find((account) => account.id === userId)?.name ?? ""
    }

    function apply(userId: number, change: UserDraftEntry) {
        const account = saved.find((item) => item.id === userId)

        if (account === undefined) {
            return
        }

        setDraft((current) => pruneReassignments(updateDraftEntry(current, account, change), saved))
        setActionError(null)
    }

    async function openReassignment(
        userId: number,
        change: UserDraftEntry,
        reason: CapacityLossReason
    ) {
        if (checkInFlight.current) {
            return
        }

        checkInFlight.current = true

        try {
            const appointments = await dispatch(
                usersApi.endpoints.getFutureAppointments.initiate(userId, {
                    forceRefetch: true,
                    subscribe: false
                })
            ).unwrap()

            if (appointments.length === 0) {
                apply(userId, change)
                return
            }

            revision.current += 1
            setReassignment({ userId, change, reason, appointments, revision: revision.current })
        } catch (caught) {
            setActionError(userApiErrorOf(caught, "future"))
        } finally {
            checkInFlight.current = false
        }
    }

    function requestChange(target: UserAccount, change: UserDraftEntry) {
        const next = { ...target, ...change }
        const reason = capacityLossReason(target, next)

        if (reason === null || draft[target.id]?.reassignment !== undefined) {
            apply(target.id, change)
            return
        }

        setActionError(null)
        void openReassignment(target.id, change, reason)
    }

    function togglePermission(target: UserAccount, key: PermissionKey) {
        requestChange(target, { permissions: applyPermissionToggle(target.permissions, key) })
    }

    function toggleActive(target: UserAccount) {
        requestChange(target, { active: !target.active })
    }

    function confirmReassignment(choice: Reassignment) {
        if (reassignment === null) {
            return
        }

        const { userId, change, reason, appointments } = reassignment
        apply(userId, {
            ...change,
            reassignment: { ...choice, count: appointments.length, reason }
        })
        setReassignment(null)
    }

    function cancelReassignment() {
        setReassignment(null)
    }

    function discard() {
        setDraft({})
        setReassignment(null)
        setActionError(null)
    }

    function reopenReassignment(userId: number) {
        const current = saved.find((account) => account.id === userId)
        const next = effective.find((account) => account.id === userId)
        const reason =
            current && next ? (capacityLossReason(current, next) ?? "deactivate") : "deactivate"
        void openReassignment(userId, {}, reason)
    }

    function handleSaveError(caught: unknown) {
        const error = userApiErrorOf(caught, "save")

        if (error === null) {
            return
        }

        if (error.userId !== undefined) {
            onSelect(error.userId)
        }

        setActionError(error)

        if (error.code === "REASSIGNMENT_REQUIRED" && error.userId !== undefined) {
            reopenReassignment(error.userId)
        }
    }

    async function save() {
        const batch = buildAccountBatch(saved, draft)

        if (batch.changes.length === 0 || saveInFlight.current) {
            return
        }

        saveInFlight.current = true
        setSaving(true)
        setActionError(null)

        try {
            const result = await saveChanges(batch).unwrap()
            setDraft({})
            showToast(
                result.redistributed > 0
                    ? t("toasts.savedWithRedistribution", { count: result.redistributed })
                    : t("toasts.saved")
            )
        } catch (caught) {
            handleSaveError(caught)
        } finally {
            saveInFlight.current = false
            setSaving(false)
        }
    }

    const message =
        actionError === null
            ? null
            : t(actionError.key, { name: nameOf(actionError.userId), ...actionError.values })

    return {
        draft,
        effective,
        reassignment,
        saving,
        actionError: message,
        togglePermission,
        toggleActive,
        confirmReassignment,
        cancelReassignment,
        discard,
        save
    }
}

export default useUserDraft
