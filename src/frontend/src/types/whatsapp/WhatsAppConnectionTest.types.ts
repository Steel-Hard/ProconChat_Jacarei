import type WhatsAppAccessTokenLifetime from "@/types/whatsapp/WhatsAppAccessTokenLifetime.types"
import type WhatsAppConnectionReason from "@/types/whatsapp/WhatsAppConnectionReason.types"

type WhatsAppConnectionTest =
    | {
          ok: true
          displayPhoneNumber: string
          verifiedName: string
          checkedAt: string
          accessTokenLifetime: WhatsAppAccessTokenLifetime
      }
    | { ok: false; reason: WhatsAppConnectionReason; checkedAt: string }

export default WhatsAppConnectionTest
