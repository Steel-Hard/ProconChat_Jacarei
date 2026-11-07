import type CancellationReason from "@/types/appointments/CancellationReason.types"

type CancellationPreview = {
    previews: { reason: CancellationReason; message: string }[]
}

export default CancellationPreview
