import { useState } from "react"
import type WhatsAppTabId from "@/types/whatsapp/WhatsAppTabId.types"

function isTabId(id: string): id is WhatsAppTabId {
    return id === "connection" || id === "privacy"
}

function useWhatsAppTab() {
    const [tab, setTab] = useState<WhatsAppTabId>("connection")

    function selectTab(id: string) {
        if (isTabId(id)) {
            setTab(id)
        }
    }

    return { tab, selectTab }
}

export default useWhatsAppTab
