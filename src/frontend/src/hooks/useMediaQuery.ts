import { useCallback, useSyncExternalStore } from "react"

function getMediaQueryList(query: string): MediaQueryList | null {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return null
    }

    return window.matchMedia(query)
}

function getServerSnapshot() {
    return false
}

function useMediaQuery(query: string): boolean {
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

export default useMediaQuery
