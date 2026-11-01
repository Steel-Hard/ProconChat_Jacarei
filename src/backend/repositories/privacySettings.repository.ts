import getPool from "../db/connection"
import { PrivacySettingsRow } from "../types/privacySettings.types"
import { PrivacySettingsRepository } from "./privacySettings.repository.interface"

interface PrivacyRow {
    controller_name: string | null
    dpo_name: string | null
    contact_email: string | null
    in_person_contact: string | null
    retention_text: string | null
    updated_by: string | null
    updated_by_name: string | null
    updated_at: Date
}

const SELECT_WITH_USER = `
    SELECT s.controller_name, s.dpo_name, s.contact_email, s.in_person_contact, s.retention_text,
           s.updated_by, u.name AS updated_by_name, s.updated_at
    FROM settings s
    LEFT JOIN Users u ON u.id = s.updated_by`

function toRow(row: PrivacyRow): PrivacySettingsRow {
    return {
        controllerName: row.controller_name,
        dpoName: row.dpo_name,
        contactEmail: row.contact_email,
        inPersonContact: row.in_person_contact,
        retentionText: row.retention_text,
        updatedBy: row.updated_by === null ? null : { id: Number(row.updated_by), name: row.updated_by_name ?? "" },
        updatedAt: row.updated_at,
    }
}

async function querySettings(statement: string, params: unknown[] = []): Promise<PrivacySettingsRow | null> {
    const result = await getPool().query<PrivacyRow>(`WITH settings AS (${statement}) ${SELECT_WITH_USER}`, params)
    const row = result.rows[0]
    return row ? toRow(row) : null
}

export const privacySettingsRepository: PrivacySettingsRepository = {
    find: () => querySettings("SELECT * FROM PrivacySettings WHERE id = 1"),

    async save(input, userId, now) {
        const row = await querySettings(
            `INSERT INTO PrivacySettings (id, controller_name, dpo_name, contact_email, in_person_contact, retention_text, updated_by, updated_at)
             VALUES (1, $1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
                controller_name = EXCLUDED.controller_name,
                dpo_name = EXCLUDED.dpo_name,
                contact_email = EXCLUDED.contact_email,
                in_person_contact = EXCLUDED.in_person_contact,
                retention_text = EXCLUDED.retention_text,
                updated_by = EXCLUDED.updated_by,
                updated_at = EXCLUDED.updated_at
             RETURNING *`,
            [input.controllerName, input.dpoName, input.contactEmail, input.inPersonContact, input.retentionText, userId, now],
        )
        if (!row) {
            throw new Error("PrivacySettings row not saved")
        }
        return row
    },
}
