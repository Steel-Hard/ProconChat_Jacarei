import post from "@/services/http/post"

async function signOut(): Promise<void> {
    await post<void>("/api/v1/auth/logout", undefined, { skipSessionRenewal: true })
}

export default signOut
