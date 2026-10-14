import { Request } from "express"

export default function readCookie(req: Pick<Request, "headers">, name: string): string | undefined {
    const header = req.headers.cookie
    if (typeof header !== "string") {
        return undefined
    }
    for (const part of header.split(";")) {
        const separator = part.indexOf("=")
        if (separator < 0 || part.slice(0, separator).trim() !== name) {
            continue
        }
        const rawValue = part.slice(separator + 1).trim()
        if (!rawValue) {
            return undefined
        }
        try {
            return decodeURIComponent(rawValue)
        } catch {
            return undefined
        }
    }
    return undefined
}
