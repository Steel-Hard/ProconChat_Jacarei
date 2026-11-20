import { describe, expect, it } from "vitest"
import { decideCancellationNoticeProblem } from "./cancellationNoticeProblem"

const failedAt = new Date("2026-11-17T10:00:00.000Z")
const later = new Date("2026-11-17T11:00:00.000Z")
const earlier = new Date("2026-11-17T09:00:00.000Z")

function decide(
    failures: { kind: "REPLY" | "CANCELLATION" | "REMINDER"; errorCode: string; failedAt?: Date }[],
    lastSuccessByKind: Partial<Record<"REPLY" | "CANCELLATION" | "REMINDER", Date>> = {},
    credentialsValid: boolean | null = true,
) {
    return decideCancellationNoticeProblem({
        signals: { failures: failures.map((failure) => ({ failedAt, ...failure })), lastSuccessByKind },
        credentialsValid,
    })
}

describe("decideCancellationNoticeProblem", () => {
    it.each([
        ["131042", "PAYMENT_METHOD", "a conta da Meta está sem forma de pagamento"],
        ["132001", "TEMPLATE_NOT_FOUND", "o modelo da mensagem não existe no idioma usado ou não está aprovado na Meta"],
        ["132000", "TEMPLATE_PARAMETER_COUNT", "o número de parâmetros enviado é diferente do modelo cadastrado na Meta"],
        ["132012", "TEMPLATE_PARAMETER_FORMAT", "os parâmetros do modelo foram enviados com formato incorreto"],
        ["132007", "TEMPLATE_POLICY_VIOLATION", "o conteúdo do modelo viola a política do WhatsApp"],
        ["132015", "TEMPLATE_PAUSED", "o modelo da mensagem foi pausado pela Meta por baixa qualidade"],
        ["132016", "TEMPLATE_DISABLED", "o modelo da mensagem foi desativado de vez pela Meta (é preciso criar um novo, com conteúdo diferente)"],
        ["132005", "TEMPLATE_TRANSLATION_TOO_LONG", "a tradução do texto do modelo ficou longa demais"],
        ["190", "INVALID_TOKEN", "o token da Meta está inválido ou expirado"],
        ["131048", "SEND_LIMIT_REACHED", "o limite de envios do número foi atingido"],
    ])("o erro %s da Meta vira o código %s com a frase da regra 11", (errorCode, code, message) => {
        expect(decide([{ kind: "CANCELLATION", errorCode }])).toEqual({ code, metaErrorCode: errorCode, message })
    })

    it.each(["131026", "131049", "131056", "131047", "999999"])("o erro %s do destinatário ou desconhecido não gera faixa", (errorCode) => {
        expect(decide([{ kind: "CANCELLATION", errorCode }])).toBeNull()
    })

    it("sem falha e com credenciais válidas ou não verificadas não há problema", () => {
        expect(decide([], {}, true)).toBeNull()
        expect(decide([], {}, null)).toBeNull()
    })

    it("credenciais marcadas como inválidas viram o problema do token sem precisar de falha", () => {
        expect(decide([], {}, false)).toEqual({
            code: "INVALID_TOKEN",
            metaErrorCode: null,
            message: "o token da Meta está inválido ou expirado",
        })
    })

    it("usa a falha de conta mais recente que ainda não foi superada por um envio bem-sucedido", () => {
        const result = decide([
            { kind: "CANCELLATION", errorCode: "131048", failedAt: later },
            { kind: "CANCELLATION", errorCode: "131042", failedAt: earlier },
        ])

        expect(result?.metaErrorCode).toBe("131048")
    })

    it("um envio bem-sucedido depois da falha de conta, de qualquer tipo de mensagem, apaga a faixa", () => {
        expect(decide([{ kind: "CANCELLATION", errorCode: "131042" }], { REPLY: later })).toBeNull()
    })

    it("um envio bem-sucedido antes ou no mesmo instante da falha não apaga a faixa", () => {
        expect(decide([{ kind: "CANCELLATION", errorCode: "131042" }], { REPLY: earlier })?.code).toBe("PAYMENT_METHOD")
        expect(decide([{ kind: "CANCELLATION", errorCode: "131042" }], { REPLY: failedAt })?.code).toBe("PAYMENT_METHOD")
    })

    it("erro de modelo de uma mensagem que não é o aviso de cancelamento não gera faixa", () => {
        expect(decide([{ kind: "REMINDER", errorCode: "132001" }])).toBeNull()
    })

    it("erro de modelo do aviso só é apagado por um aviso de cancelamento bem-sucedido, não por outro tipo", () => {
        expect(decide([{ kind: "CANCELLATION", errorCode: "132001" }], { REMINDER: later })?.code).toBe("TEMPLATE_NOT_FOUND")
        expect(decide([{ kind: "CANCELLATION", errorCode: "132001" }], { CANCELLATION: later })).toBeNull()
    })

    it("erro de conta de um lembrete também vale para o aviso de cancelamento", () => {
        expect(decide([{ kind: "REMINDER", errorCode: "131042" }])?.code).toBe("PAYMENT_METHOD")
    })

    it("a falha de conta superada não esconde uma falha de modelo mais antiga ainda sem envio bem-sucedido", () => {
        const result = decide(
            [
                { kind: "CANCELLATION", errorCode: "131042", failedAt: later },
                { kind: "CANCELLATION", errorCode: "132001", failedAt: earlier },
            ],
            { REPLY: new Date(later.getTime() + 1) },
        )

        expect(result?.code).toBe("TEMPLATE_NOT_FOUND")
    })
})
