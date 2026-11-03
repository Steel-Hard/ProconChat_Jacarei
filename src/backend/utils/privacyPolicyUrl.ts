const PRIVACY_POLICY_PATH = "/privacidade"

export function privacyPolicyUrlFrom(base: string | undefined): string | null {
    return base ? new URL(PRIVACY_POLICY_PATH, base).toString() : null
}
