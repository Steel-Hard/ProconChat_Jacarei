function normalizeText(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
}

export function isDuplicateDocument(groupDoc: string, questionDocs: string[]): boolean {
    const normGroup = normalizeText(groupDoc)
    if (!normGroup) {
        return false
    }

    return questionDocs.some((qDoc) => {
        const normQ = normalizeText(qDoc)
        if (!normQ) {
            return false
        }
        if (normGroup === normQ) {
            return true
        }

        const wordsGroup = normGroup.split(/[^\p{L}\p{N}]+/u)
        const wordsQ = normQ.split(/[^\p{L}\p{N}]+/u)

        if ((normGroup === "rg" || normGroup === "cpf") && wordsQ.includes(normGroup)) {
            return true
        }
        if ((normQ === "rg" || normQ === "cpf") && wordsGroup.includes(normQ)) {
            return true
        }

        return false
    })
}

export function findDuplicateDocuments(groupDocs: string[], questionDocs: string[]): Set<string> {
    const duplicates = new Set<string>()

    for (const doc of groupDocs) {
        if (isDuplicateDocument(doc, questionDocs)) {
            duplicates.add(doc)
        }
    }

    return duplicates
}

export default findDuplicateDocuments
