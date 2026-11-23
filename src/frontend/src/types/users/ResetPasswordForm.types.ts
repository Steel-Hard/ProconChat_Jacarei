type ResetPasswordForm = {
    password: string
    setPassword: (value: string) => void
    confirmPassword: string
    setConfirmPassword: (value: string) => void
    error: string | null
    canSubmit: boolean
    saving: boolean
    submit: () => Promise<void>
    reset: () => void
}

export default ResetPasswordForm
