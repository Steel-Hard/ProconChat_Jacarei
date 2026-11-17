import normalizeDocument from "@/utils/documents/normalizeDocument"

function isDocumentTaken(items: string[], text: string, exceptIndex?: number): boolean {
    const wanted = normalizeDocument(text)

    return items.some((item, index) => index !== exceptIndex && normalizeDocument(item) === wanted)
}

export default isDocumentTaken
