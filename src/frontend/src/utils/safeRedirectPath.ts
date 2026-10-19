import ROUTES from "@/routers/paths"

function hasControlCharacter(value: string): boolean {
    return Array.from(value).some((char) => {
        const code = char.charCodeAt(0)

        return code < 0x20 || code === 0x7f
    })
}

function safeRedirectPath(value: string | null): string | null {
    if (typeof value !== "string" || !value.startsWith("/")) {
        return null
    }

    if (value.startsWith("//") || value.startsWith("/\\") || hasControlCharacter(value)) {
        return null
    }

    const origin = window.location.origin
    let url: URL

    try {
        url = new URL(value, origin)
    } catch {
        return null
    }

    if (url.origin !== origin || url.pathname === ROUTES.login) {
        return null
    }

    return url.pathname + url.search + url.hash
}

export default safeRedirectPath
