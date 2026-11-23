import getPool from "../db/connection"

export interface AppointmentRetentionRepository {
    erasePastAppointmentPhones(now: Date): Promise<number>
}

export const appointmentRetentionRepository: AppointmentRetentionRepository = {
    async erasePastAppointmentPhones(now) {
        const result = await getPool().query(
            `UPDATE Appointments
             SET phone_encrypted = NULL
             WHERE phone_encrypted IS NOT NULL
               AND appointment_datetime <= $1`,
            [now],
        )
        return result.rowCount ?? 0
    },
}
