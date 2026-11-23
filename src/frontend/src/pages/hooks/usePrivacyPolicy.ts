import privacySettingsApi from "@/store/api/privacySettings.api"

function usePrivacyPolicy() {
    const query = privacySettingsApi.useGetPublicPrivacyQuery()

    return { settings: query.data ?? null, loading: query.isLoading, failed: query.isError }
}

export default usePrivacyPolicy
