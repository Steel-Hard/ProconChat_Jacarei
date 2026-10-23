import type UserAccount from "@/types/users/UserAccount.types"

function buildUserAccount(overrides: Partial<UserAccount> = {}): UserAccount {
    return {
        id: 7,
        name: "Bruno Lima",
        email: "bruno@exemplo.gov.br",
        isAdmin: false,
        active: true,
        permissions: [],
        lastLoginAt: null,
        permissionsUpdatedAt: null,
        permissionsUpdatedBy: null,
        ...overrides
    }
}

export default buildUserAccount
