import { z } from "zod"

function retentionDays(min: number) {
    const message = { message: `Use um número inteiro de ${min} a 1825` }
    return z.coerce.number(message).int(message).min(min, message).max(1825, message)
}

export const retentionPreviewQuerySchema = z.object({
    sessionDays: retentionDays(30),
    appointmentDays: retentionDays(90),
})

export type RetentionPreviewQuery = z.infer<typeof retentionPreviewQuerySchema>
