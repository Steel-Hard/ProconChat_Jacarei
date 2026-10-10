import { useCallback, useSyncExternalStore } from "react"

export const DOCKED_QUERY = "(min-width: 1200px)"
export const COMPACT_TABLE_QUERY = "(max-width: 1431px)"
export const ACCOUNT_EMAIL_QUERY = "(min-width: 940px)"

function getMediaQueryList(query: string): MediaQueryList | null {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return null
    }

    return window.matchMedia(query)
}

function getServerSnapshot() {
    return false
}

export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const list = getMediaQueryList(query)

            if (list === null) {
                return () => {}
            }

            list.addEventListener("change", onChange)
            return () => list.removeEventListener("change", onChange)
        },
        [query]
    )
    const getSnapshot = useCallback(() => getMediaQueryList(query)?.matches ?? false, [query])

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useIsDocked(): boolean {
    return useMediaQuery(DOCKED_QUERY)
}

export function useCompactTable(): boolean {
    return useMediaQuery(COMPACT_TABLE_QUERY)
}

export function useShowAccountEmail(): boolean {
    return useMediaQuery(ACCOUNT_EMAIL_QUERY)
}
