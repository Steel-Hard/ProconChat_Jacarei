import { useId } from "react"
import ConfirmDialog from "@/components/ConfirmDialog"
import type CreateAccountDialogTexts from "@/types/users/CreateAccountDialogTexts.types"
import type CreateAccountForm from "@/types/users/CreateAccountForm.types"
import css from "@/styles/components/createAccountDialog.module.css"

type CreateAccountDialogProps = {
    open: boolean
    texts: CreateAccountDialogTexts
    form: CreateAccountForm
    onCancel: () => void
}

function CreateAccountDialog({ open, texts, form, onCancel }: CreateAccountDialogProps) {
    const emailErrorId = useId()
    const passwordErrorId = useId()

    function cancel() {
        form.reset()
        onCancel()
    }

    return (
        <ConfirmDialog
            open={open}
            submitOnEnter
            title={texts.title}
            confirmLabel={texts.confirm}
            cancelLabel={texts.cancel}
            confirmDisabled={!form.canSubmit}
            busy={form.saving}
            onConfirm={() => void form.submit()}
            onCancel={cancel}
        >
            <div className={css.fields}>
                <label className={css.field}>
                    {texts.name}
                    <input
                        className={css.input}
                        autoComplete="off"
                        maxLength={150}
                        value={form.name}
                        onChange={(event) => form.setName(event.target.value)}
                    />
                </label>
                <div className={css.group}>
                    <label className={css.field}>
                        {texts.email}
                        <input
                            className={form.emailError ? `${css.input} ${css.invalid}` : css.input}
                            type="email"
                            autoComplete="off"
                            maxLength={150}
                            placeholder={texts.emailPlaceholder}
                            aria-invalid={form.emailError ? true : undefined}
                            aria-describedby={form.emailError ? emailErrorId : undefined}
                            value={form.email}
                            onChange={(event) => form.setEmail(event.target.value)}
                        />
                    </label>
                    {form.emailError ? (
                        <span id={emailErrorId} className={css.fieldError}>
                            {form.emailError}
                        </span>
                    ) : null}
                </div>
                <div className={css.group}>
                    <label className={css.field}>
                        {texts.password}
                        <input
                            className={css.input}
                            type="password"
                            autoComplete="new-password"
                            placeholder={texts.passwordPlaceholder}
                            aria-describedby={form.passwordError ? passwordErrorId : undefined}
                            value={form.password}
                            onChange={(event) => form.setPassword(event.target.value)}
                        />
                    </label>
                    {form.passwordError ? (
                        <span id={passwordErrorId} className={css.fieldError}>
                            {form.passwordError}
                        </span>
                    ) : null}
                </div>
                <p className={css.note}>{texts.note}</p>
                {form.error ? (
                    <div role="alert" className={css.error}>
                        {form.error}
                    </div>
                ) : null}
            </div>
        </ConfirmDialog>
    )
}

export default CreateAccountDialog
