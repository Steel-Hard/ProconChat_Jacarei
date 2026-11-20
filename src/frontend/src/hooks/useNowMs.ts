import { useEffect, useState } from "react"

const REFRESH_MS = 30_000

function useNowMs(): number {
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), REFRESH_MS)

        return () => clearInterval(timer)
    }, [])

    return now
}

export default useNowMs
