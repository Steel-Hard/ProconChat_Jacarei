import post from "@/services/http/post"

async function resetUserPassword(id: number, password: string): Promise<void> {
    await post<unknown>(`/api/v1/users/${encodeURIComponent(String(id))}/reset-password`, {
        password
    })
}

export default resetUserPassword
