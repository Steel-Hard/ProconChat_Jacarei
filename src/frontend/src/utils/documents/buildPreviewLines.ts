import type DocumentsPreviewData from "@/types/documents/DocumentsPreviewData.types"
import type DocumentsPreviewLine from "@/types/documents/DocumentsPreviewLine.types"

const BULLET = "• "

export default function buildPreviewLines(preview: DocumentsPreviewData): DocumentsPreviewLine[] {
    const blocks = [preview.groupBlock, preview.questionBlock]
    let current: (typeof blocks)[number] = null
    let index = 0

    return preview.text.split("\n").map((text) => {
        const heading = blocks.find((block) => block !== null && block.heading === text)

        if (heading) {
            current = heading
            index = 0
            return { text, repeated: false }
        }

        if (text === "") {
            current = null
            return { text, repeated: false }
        }

        if (current !== null && text.startsWith(BULLET)) {
            const item = current.items[index]
            index += 1
            return {
                text,
                repeated: item !== undefined && item.repeated && text === BULLET + item.text
            }
        }

        return { text, repeated: false }
    })
}
