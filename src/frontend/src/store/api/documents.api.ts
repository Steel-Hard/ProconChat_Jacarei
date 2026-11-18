import api from "@/store/api"
import type DocumentsEnvelope from "@/types/documents/DocumentsEnvelope.types"
import type DocumentsPreviewArgs from "@/types/documents/DocumentsPreviewArgs.types"
import type DocumentsPreviewData from "@/types/documents/DocumentsPreviewData.types"
import type DocumentsConfig from "@/types/documents/DocumentsConfig.types"
import type DocumentsConfigView from "@/types/documents/DocumentsConfigView.types"

const DOCUMENTS_PATH = "/api/v1/documents"
const DOCUMENTS_PREVIEW_PATH = `${DOCUMENTS_PATH}/preview`

function unwrap<T>(response: DocumentsEnvelope<T>): T {
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
        }),
        previewDocuments: build.query<DocumentsPreviewData, DocumentsPreviewArgs>({
            query: (body) => ({
                url: DOCUMENTS_PREVIEW_PATH,
                method: "POST",
                body
            }),
            transformResponse: unwrap<DocumentsPreviewData>,
            providesTags: ["DocumentsPreview"],
            keepUnusedDataFor: 0
        })
    })
})

export default documentsApi
