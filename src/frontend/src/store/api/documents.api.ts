import api from "@/store/api"
import type DocumentsConfig from "@/types/documents/DocumentsConfig.types"
import type DocumentsConfigView from "@/types/documents/DocumentsConfigView.types"

type Envelope<T> = { data: T }

const DOCUMENTS_PATH = "/api/v1/documents"

function unwrap<T>(response: Envelope<T>): T {
    return response.data
}

const documentsApi = api.injectEndpoints({
    endpoints: (build) => ({
        getDocuments: build.query<DocumentsConfigView, void>({
            query: () => DOCUMENTS_PATH,
            transformResponse: unwrap<DocumentsConfigView>,
            providesTags: ["Documents"]
        }),
        saveDocuments: build.mutation<DocumentsConfigView, DocumentsConfig>({
            query: (body) => ({
                url: DOCUMENTS_PATH,
                method: "PUT",
                body
            }),
            transformResponse: unwrap<DocumentsConfigView>,
            invalidatesTags: ["Documents", "DocumentsPreview"],
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const result = await queryFulfilled.catch(() => null)

                if (result !== null) {
                    dispatch(
                        documentsApi.util.upsertQueryEntries([
                            { endpointName: "getDocuments", arg: undefined, value: result.data }
                        ])
                    )
                }
            }
        })
    })
})

export default documentsApi
