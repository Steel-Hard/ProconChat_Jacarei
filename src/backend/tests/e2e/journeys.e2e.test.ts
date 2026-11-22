import { describe, expect, test } from "vitest"
import { expectedWhen, protocolOf } from "./helpers/journeys"

describe("protocolOf", () => {
    test("extrai os 8 caracteres depois de Protocolo", () => {
        expect(protocolOf("Agendamento realizado\nProtocolo: 1A2B3C4D\nLocal: Rua")).toBe("1A2B3C4D")
    })

    test("aceita o protocolo em negrito", () => {
        expect(protocolOf("Protocolo: *9F8E7D6C*")).toBe("9F8E7D6C")
    })

    test("falha quando a resposta nao tem protocolo", () => {
        expect(() => protocolOf("Sem nada aqui")).toThrow()
    })
})

describe("expectedWhen", () => {
    test("usa o fuso de Sao Paulo e nao o da maquina", () => {
        expect(expectedWhen(new Date("2031-06-10T12:30:00.000Z"))).toBe("10/06 às 09:30")
    })

    test("muda o dia quando o horario em UTC ja virou o dia", () => {
        expect(expectedWhen(new Date("2031-06-11T01:30:00.000Z"))).toBe("10/06 às 22:30")
    })
})
