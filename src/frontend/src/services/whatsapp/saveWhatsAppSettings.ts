import put from "@/services/http/put"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"
import type WhatsAppSettingsInput from "@/types/whatsapp/WhatsAppSettingsInput.types"

async function saveWhatsAppSettings(input: WhatsAppSettingsInput): Promise<WhatsAppSettings> {
    const response = await put<{ data: WhatsAppSettings }>("/api/v1/whatsapp/settings", input)

    return response.data
}

export default saveWhatsAppSettings
