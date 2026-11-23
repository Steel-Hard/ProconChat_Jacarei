type CreateAccountForm = {
    name: string
    setName: (value: string) => void
    email: string
    setEmail: (value: string) => void
    password: string
    setPassword: (value: string) => void
    emailError: string | null
    passwordError: string | null
    error: string | null
    canSubmit: boolean
    saving: boolean
    submit: () => Promise<void>
    reset: () => void
}

export default CreateAccountForm
