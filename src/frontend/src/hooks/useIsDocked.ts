import useMediaQuery from "@/hooks/useMediaQuery"

const DOCKED_QUERY = "(min-width: 1200px)"

function useIsDocked(): boolean {
    return useMediaQuery(DOCKED_QUERY)
}

export default useIsDocked
