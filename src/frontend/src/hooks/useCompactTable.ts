import useMediaQuery from "@/hooks/useMediaQuery"

const COMPACT_TABLE_QUERY = "(max-width: 1431px)"

function useCompactTable(): boolean {
    return useMediaQuery(COMPACT_TABLE_QUERY)
}

export default useCompactTable
