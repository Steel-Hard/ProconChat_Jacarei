import {
    AppointmentRetentionRepository,
    appointmentRetentionRepository,
} from "../repositories/appointmentRetention.repository"

interface AppointmentRetentionDependencies {
    repository: AppointmentRetentionRepository
    clock?: () => Date
}

export function createSweepPastAppointmentPhones({
    repository,
    clock = () => new Date(),
}: AppointmentRetentionDependencies): () => Promise<number> {
    return () => repository.erasePastAppointmentPhones(clock())
}

export const sweepPastAppointmentPhones = createSweepPastAppointmentPhones({ repository: appointmentRetentionRepository })
