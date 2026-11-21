import normalizeComparisonText from "@/utils/content/normalizeComparisonText"

export default function duplicateDocuments(documents: string[]): number[] {
    const seen = new Set<string>()
    const repeated: number[] = []

    documents.forEach((document, index) => {
        const normalized = normalizeComparisonText(document)

        if (normalized === "") {
            return
        }

        if (seen.has(normalized)) {
            repeated.push(index)
            return
        }

        seen.add(normalized)
    })

    return repeated
}
