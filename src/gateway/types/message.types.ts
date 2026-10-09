export interface IncomingMessage {
    id: string
    from: string
    timestampMs?: number
    text?: string
    optionId?: string
}

export interface ListRow {
    id: string
    title: string
    description?: string
}

export interface ReplyButton {
    id: string
    title: string
}

export type OutgoingMessage =
    | { type: "text"; text: string }
    | { type: "list"; text: string; buttonText: string; rows: ListRow[] }
    | { type: "buttons"; text: string; buttons: ReplyButton[] }
