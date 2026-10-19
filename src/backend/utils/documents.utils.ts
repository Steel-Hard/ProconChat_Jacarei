type DocumentsSent = {
    group?: string[]
    question?: string[]
}

type DocumentsConfig = {
    group: string[]
    question: string[]
}

function sameItems(sent: string[], current: string[]): boolean {
    return JSON.stringify(sent.slice().sort()) === JSON.stringify(current.slice().sort())
}

export function isDocumentsConfigDifferent(sent: DocumentsSent, current: DocumentsConfig): boolean {
    const groupSent = sent.group || []
    const questionSent = sent.question || []
    return !sameItems(groupSent, current.group) || !sameItems(questionSent, current.question)
}
