import { useEffect, useState } from "react"

function useDebouncedValue<T>(value: T, delayMs: number, publishNow?: (current: T) => boolean): T {
    const [debounced, setDebounced] = useState(value)

    if (publishNow?.(debounced) === true && debounced !== value) {
        setDebounced(value)
    }

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs)

        return () => clearTimeout(timer)
    }, [value, delayMs])

    return debounced
}

export default useDebouncedValue
