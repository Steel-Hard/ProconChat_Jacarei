import { describe, expect, it } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import {
    buildDefaultScheduleConfigView,
    createScheduleStubRepository,
} from "../repositories/mock/scheduleStub.repository"
import { BlockedDateItem } from "../types/schedule.types"
import { buildScheduleConfigInput } from "./mock/scheduleConfig.builders"
import { createScheduleService } from "./schedule.service"

const NOW = new Date("2026-10-05T09:00:00-03:00")
const CHANGE_DATE = "2026-10-12"

function holiday(date: string): BlockedDateItem {
    return { date, startTime: null, endTime: null, description: "Feriado" }
}

function serviceWith(baseBlocks: BlockedDateItem[] = [], changeBlocks: BlockedDateItem[] = []) {
    const repository = createScheduleStubRepository({
        config: buildDefaultScheduleConfigView({ blockedDates: baseBlocks }),
        scheduledConfigs: [
            { effectiveFrom: CHANGE_DATE, config: buildDefaultScheduleConfigView({ blockedDates: changeBlocks }) },
        ],
    })
    return createScheduleService(repository)
}

async function rejectionOf(attempt: Promise<unknown>): Promise<BadRequestError> {
    const error = await attempt.then(
        () => null,
        (reason: unknown) => reason,
    )
    if (!(error instanceof BadRequestError)) {
        throw new Error("O salvamento deveria ser recusado com 400")
    }
    return error
}

describe("ScheduleService: bloqueio novo fora da vigência da versão salva", () => {
    it("recusa na configuração de hoje o bloqueio novo numa data que segue a próxima mudança, apontando o campo", async () => {
        const service = serviceWith()
        const input = buildScheduleConfigInput({ blockedDates: [holiday("2026-10-07"), holiday("2026-10-20")] })

        const error = await rejectionOf(service.saveConfig(input, 1, NOW))

        expect(error.details).toEqual({
            issues: [{ path: "blockedDates.1.date", message: "Esta data segue a mudança de 12/10. Bloqueie lá." }],
        })
    })

    it("aceita na configuração de hoje o bloqueio novo dentro da vigência dela", async () => {
        const service = serviceWith()
        const input = buildScheduleConfigInput({ blockedDates: [holiday("2026-10-07")] })

        const saved = await service.saveConfig(input, 1, NOW)

        expect(saved.blockedDates.map((block) => block.date)).toEqual(["2026-10-07"])
    })

    it("recusa na mudança agendada o bloqueio novo numa data anterior ao início dela", async () => {
        const service = serviceWith()
        const input = buildScheduleConfigInput({ blockedDates: [holiday("2026-10-08")] })

        const error = await rejectionOf(service.saveScheduledConfig(input, CHANGE_DATE, 1, NOW))

        expect(error.details).toEqual({
            issues: [
                {
                    path: "blockedDates.0.date",
                    message: "Esta data vem antes do início desta mudança (12/10). Bloqueie na configuração que vale nessa data.",
                },
            ],
        })
    })

    it("mantém o bloqueio fora da vigência que já estava na cópia da versão", async () => {
        const service = serviceWith([holiday("2026-10-20")], [holiday("2026-10-08")])

        const savedToday = await service.saveConfig(buildScheduleConfigInput({ blockedDates: [holiday("2026-10-20")] }), 1, NOW)
        const savedChange = await service.saveScheduledConfig(
            buildScheduleConfigInput({ blockedDates: [holiday("2026-10-08")] }),
            CHANGE_DATE,
            1,
            NOW,
        )

        expect([savedToday.blockedDates, savedChange.blockedDates]).toEqual([
            [holiday("2026-10-20")],
            [holiday("2026-10-08")],
        ])
    })

    it("aceita ao criar uma mudança os bloqueios copiados da versão que vale antes dela", async () => {
        const service = serviceWith([holiday("2026-10-08")])

        const saved = await service.saveScheduledConfig(
            buildScheduleConfigInput({ blockedDates: [holiday("2026-10-08")] }),
            "2026-10-09",
            1,
            NOW,
        )

        expect(saved.effectiveFrom).toBe("2026-10-09")
    })
})
