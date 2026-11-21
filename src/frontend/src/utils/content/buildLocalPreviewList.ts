import type ContentPreviewListModel from "@/types/content/ContentPreviewListModel.types"
import type ContentPreviewListRowInput from "@/types/content/ContentPreviewListRowInput.types"
import whatsappPages from "@/utils/content/whatsappPages"

export default function buildLocalPreviewList(
    rows: ContentPreviewListRowInput[]
): ContentPreviewListModel {
    const pages = whatsappPages(rows, () => true)
    const currentPage = pages.find((entry) => entry.item.isCurrent)?.whatsappPage ?? 1

    return {
        text: null,
        buttonText: null,
        rows: pages
            .map((entry, index) => ({ entry, index }))
            .filter(({ entry }) => entry.whatsappPage === currentPage)
            .map(({ entry, index }) => ({
                key: String(index),
                title: entry.item.shortTitle,
                description: entry.item.shortDescription,
                isCurrent: entry.item.isCurrent
            }))
    }
}
