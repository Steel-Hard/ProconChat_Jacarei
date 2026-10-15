import post from "@/services/http/post"

async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await post<unknown>("/api/v1/auth/change-password", { currentPassword, newPassword })
}

export default changePassword
