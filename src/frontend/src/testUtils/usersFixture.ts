import buildUserAccount from "@/testUtils/buildUserAccount"
import type UserAccountList from "@/types/users/UserAccountList.types"

const USERS_FIXTURE: UserAccountList = {
    items: [
        buildUserAccount({
            id: 1,
            name: "Ana Paula Souza",
            email: "ana@exemplo.gov.br",
            isAdmin: true,
            permissions: [
                "appointments.view",
                "appointments.manage",
                "content.manage",
                "schedule.configure",
                "documents.configure",
                "sessions.view",
                "reports.view",
                "users.manage"
            ],
            lastLoginAt: "2026-10-20T13:05:00.000Z"
        }),
        buildUserAccount({
            id: 7,
            name: "Bruno Lima",
            email: "bruno@exemplo.gov.br",
            permissions: ["appointments.view", "appointments.manage"],
            lastLoginAt: "2026-10-19T17:30:00.000Z",
            permissionsUpdatedAt: "2026-10-18T12:00:00.000Z",
            permissionsUpdatedBy: { id: 1, name: "Ana Paula Souza" }
        }),
        buildUserAccount({
            id: 3,
            name: "Carla Dias",
            email: "carla@exemplo.gov.br",
            permissions: ["users.manage", "appointments.view"]
        }),
        buildUserAccount({
            id: 9,
            name: "Diego Rocha",
            email: "diego@exemplo.gov.br",
            active: false,
            permissions: ["reports.view"]
        })
    ],
    lastChange: { name: "Ana Paula Souza", at: "2026-10-18T12:00:00.000Z" }
}

export default USERS_FIXTURE
