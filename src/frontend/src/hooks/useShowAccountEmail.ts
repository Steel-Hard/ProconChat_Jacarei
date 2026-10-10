import useMediaQuery from "@/hooks/useMediaQuery"

const ACCOUNT_EMAIL_QUERY = "(min-width: 940px)"

function useShowAccountEmail(): boolean {
    return useMediaQuery(ACCOUNT_EMAIL_QUERY)
}

export default useShowAccountEmail
