import { z } from "zod"

export const cancellationNoticeBodySchema = z.object({ enabled: z.boolean() }).strict()
