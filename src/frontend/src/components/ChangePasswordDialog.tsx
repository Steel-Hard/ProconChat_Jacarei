import { useTranslation } from "react-i18next"
import ConfirmDialog from "@/components/ConfirmDialog"
import useChangePasswordForm from "@/hooks/useChangePasswordForm"
import useToast from "@/hooks/useToast"
import css from "@/styles/components/changePasswordDialog.module.css"

type ChangePasswordDialogProps = {
    open: boolean
    email: string
    onClose: () => void
}

function ChangePasswordDialog({ open, email, onClose }: ChangePasswordDialogProps) {
    const { t } = useTranslation()
    const { showToast } = useToast()
    const form = useChangePasswordForm(() => {
        showToast(t("changePassword.success"))
        onClose()
    })

    function cancel() {
        form.reset()
        onClose()
    }

    return (
        <ConfirmDialog
            open={open}
            submitOnEnter
            title={t("changePassword.title")}
            description={t("changePassword.description", { email })}
            confirmLabel={t("changePassword.save")}
            cancelLabel={t("changePassword.cancel")}
            confirmDisabled={!form.canSave}
            busy={form.saving}
            onConfirm={() => void form.submit()}
            onCancel={cancel}
        >
            <div className={css.fields}>
                <label className={css.field}>
                    {t("changePassword.current")}
                    <input
                        className={css.input}
                        type="password"
                        autoComplete="current-password"
                        value={form.currentPassword}
                        onChange={(event) => form.setCurrentPassword(event.target.value)}
                    />
                </label>
                <label className={css.field}>
                    {t("changePassword.new")}
                    <input
                        className={css.input}
                        type="password"
                        autoComplete="new-password"
                        placeholder={t("changePassword.newPlaceholder")}
                        value={form.newPassword}
                        onChange={(event) => form.setNewPassword(event.target.value)}
                    />
                </label>
                <label className={css.field}>
                    {t("changePassword.confirm")}
                    <input
                        className={css.input}
                        type="password"
                        autoComplete="new-password"
                        value={form.confirmPassword}
                        onChange={(event) => form.setConfirmPassword(event.target.value)}
                    />
                </label>
                {form.error ? (
                    <div role="alert" className={css.error}>
                        {form.error}
                    </div>
                ) : null}
            </div>
        </ConfirmDialog>
    )
}

export default ChangePasswordDialog
