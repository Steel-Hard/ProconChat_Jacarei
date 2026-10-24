import { useState } from "react"
import { useTranslation } from "react-i18next"
import useToast from "@/hooks/useToast"
import useCreateAccountForm from "@/pages/hooks/useCreateAccountForm"
import useResetPasswordForm from "@/pages/hooks/useResetPasswordForm"
import useUserDraft from "@/pages/hooks/useUserDraft"
import useUserViews from "@/pages/hooks/useUserViews"
import createUserAccount from "@/services/users/createUserAccount"
import resetUserPassword from "@/services/users/resetUserPassword"
import usersApi from "@/store/api/users.api"
import useAppDispatch from "@/store/useAppDispatch"
import useAppSelector from "@/store/useAppSelector"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"
import type LastChange from "@/types/settings/LastChange.types"
import type CreateAccountInput from "@/types/users/CreateAccountInput.types"
import type UserAccount from "@/types/users/UserAccount.types"
import userApiErrorOf from "@/utils/userApiErrorOf"

type OpenDialog = "create" | "reset" | "ownPassword" | null

const NO_ACCOUNTS: UserAccount[] = []

const ANONYMOUS: PanelAccount = { id: 0, name: "", email: "", isAdmin: false, permissions: [] }

function useUsers() {
    const { t } = useTranslation(["users", "common"])
    const { showToast } = useToast()
    const dispatch = useAppDispatch()
    const actor = useAppSelector((state) => state.account.current) ?? ANONYMOUS
    const query = usersApi.useGetUsersQuery()
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [dialog, setDialog] = useState<OpenDialog>(null)
    const saved = query.data?.items ?? NO_ACCOUNTS
    const draft = useUserDraft({ saved, onSelect: setSelectedId })
    const selected =
        draft.effective.find((account) => account.id === selectedId) ?? draft.effective[0] ?? null
    const views = useUserViews({
        actor,
        saved,
        effective: draft.effective,
        draft: draft.draft,
        selected,
        reassignment: draft.reassignment
    })

    async function create(input: CreateAccountInput) {
        const account = await createUserAccount(input)
        dispatch(usersApi.util.invalidateTags(["UserList"]))
        setSelectedId(account.id)
        setDialog(null)
        showToast(t("toasts.created"))
    }

    async function resetPassword(password: string) {
        if (selected === null) {
            return
        }

        const name = selected.name
        await resetUserPassword(selected.id, password)
        setDialog(null)
        showToast(t("toasts.passwordReset", { name }))
    }

    const createForm = useCreateAccountForm(
        saved.map((account) => account.email),
        create
    )
    const resetForm = useResetPasswordForm(resetPassword)

    const status = query.data ? "ready" : query.isError ? "error" : "loading"
    const loadError = query.isError ? userApiErrorOf(query.error, "load") : null
    const lastChange: LastChange | null = query.data?.lastChange
        ? { changedBy: query.data.lastChange.name, changedAt: query.data.lastChange.at }
        : null

    return {
        status,
        loadError: loadError === null ? null : t(loadError.key, { name: "" }),
        lastChange,
        rows: views.rows,
        panel: views.panel,
        changes: views.changes,
        locked: draft.locked,
        actionError: draft.actionError,
        reassignment: views.reassignment,
        actorEmail: actor.email,
        dialog,
        createForm,
        resetForm,
        resetTitle: t("dialogs.reset.title", { name: selected?.name ?? "" }),
        select: setSelectedId,
        togglePermission: (key: PermissionKey) => {
            if (selected !== null) {
                draft.togglePermission(selected, key)
            }
        },
        toggleActive: () => {
            if (selected !== null) {
                draft.toggleActive(selected)
            }
        },
        confirmReassignment: draft.confirmReassignment,
        cancelReassignment: draft.cancelReassignment,
        discard: draft.discard,
        save: draft.save,
        openCreate: () => setDialog("create"),
        openReset: () => setDialog("reset"),
        openOwnPassword: () => setDialog("ownPassword"),
        closeDialog: () => setDialog(null)
    }
}

export default useUsers
