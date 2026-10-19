import post from "@/services/http/post"
import type WhatsAppConnectionTest from "@/types/whatsapp/WhatsAppConnectionTest.types"
import type WhatsAppSettingsInput from "@/types/whatsapp/WhatsAppSettingsInput.types"

async function testWhatsAppConnection(
    input: WhatsAppSettingsInput
): Promise<WhatsAppConnectionTest> {
    const response = await post<{ data: WhatsAppConnectionTest }>(
        "/api/v1/whatsapp/settings/test",
        input
    )

    return response.data
}

export default testWhatsAppConnection
