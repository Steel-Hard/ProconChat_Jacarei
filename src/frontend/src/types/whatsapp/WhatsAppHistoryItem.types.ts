type WhatsAppHistoryItem = {
    id: string
    action: string
    fields: string[]
    actor: { id: number; name: string } | null
    createdAt: string
}

export default WhatsAppHistoryItem
