import ConfirmDialog from "@/components/ConfirmDialog"
import type ResetPasswordDialogTexts from "@/types/users/ResetPasswordDialogTexts.types"
import type ResetPasswordForm from "@/types/users/ResetPasswordForm.types"
import css from "@/styles/components/resetPasswordDialog.module.css"

type ResetPasswordDialogProps = {
    open: boolean
    texts: ResetPasswordDialogTexts
    form: ResetPasswordForm
    onCancel: () => void
}

function ResetPasswordDialog({ open, texts, form, onCancel }: ResetPasswordDialogProps) {
    function cancel() {
        form.reset()
        onCancel()
    }

    return (
        <ConfirmDialog
            open={open}
            submitOnEnter
            title={texts.title}
            description={texts.description}
            confirmLabel={texts.confirm}
            cancelLabel={texts.cancel}
            confirmDisabled={!form.canSubmit}
            busy={form.saving}
            onConfirm={() => void form.submit()}
            onCancel={cancel}
        >
            <div className={css.fields}>
                <label className={css.field}>
                    {texts.password}
                    <input
                        className={css.input}
                        type="password"
                        autoComplete="new-password"
                        placeholder={texts.passwordPlaceholder}
                        value={form.password}
                        onChange={(event) => form.setPassword(event.target.value)}
                    />
                </label>
                <label className={css.field}>
                    {texts.confirmPassword}
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

export default ResetPasswordDialog
