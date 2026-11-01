import { z } from "zod"

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function maxLength(max: number) {
    return { message: `Use no máximo ${max} caracteres` }
}

function textField(target: z.ZodString) {
    return z
        .string()
        .nullable()
        .transform((value) => (value === null ? null : value.trim() || null))
        .pipe(target.nullable())
}

export const privacySettingsBodySchema = z.object({
    controllerName: textField(z.string().max(150, maxLength(150))),
    dpoName: textField(z.string().max(150, maxLength(150))),
    contactEmail: textField(z.string().max(254, maxLength(254)).regex(EMAIL_PATTERN, { message: "E-mail inválido" })),
    inPersonContact: textField(z.string().max(300, maxLength(300))),
    retentionText: textField(z.string().max(2000, maxLength(2000))),
})

export type PrivacySettingsBody = z.infer<typeof privacySettingsBodySchema>
