import type PasswordProblem from "@/types/users/PasswordProblem.types"

const MIN_LENGTH = 8
const MAX_BYTES = 72

function passwordProblem(password: string): PasswordProblem | null {
    if (password.length > 0 && password.length < MIN_LENGTH) {
        return "tooShort"
    }

    return new TextEncoder().encode(password).length > MAX_BYTES ? "tooLong" : null
}

export default passwordProblem
