import {
    CancellationNoticeProblem,
    CancellationNoticeProblemCode,
    DeliveryProblemSignals,
    OutboundKind,
} from "../types/outboundMessage.types"

interface ProblemRule {
    code: CancellationNoticeProblemCode
    message: string
    scope: "ACCOUNT" | "TEMPLATE"
}

const RULES: Record<string, ProblemRule> = {
    "131042": { code: "PAYMENT_METHOD", message: "a conta da Meta está sem forma de pagamento", scope: "ACCOUNT" },
    "190": { code: "INVALID_TOKEN", message: "o token da Meta está inválido ou expirado", scope: "ACCOUNT" },
    "131048": { code: "SEND_LIMIT_REACHED", message: "o limite de envios do número foi atingido", scope: "ACCOUNT" },
    "132001": {
        code: "TEMPLATE_NOT_FOUND",
        message: "o modelo de aviso não existe no idioma usado ou não está aprovado na Meta",
        scope: "TEMPLATE",
    },
    "132000": {
        code: "TEMPLATE_PARAMETER_COUNT",
        message: "o número de parâmetros enviado é diferente do modelo cadastrado na Meta",
        scope: "TEMPLATE",
    },
    "132012": {
        code: "TEMPLATE_PARAMETER_FORMAT",
        message: "os parâmetros do modelo foram enviados com formato incorreto",
        scope: "TEMPLATE",
    },
    "132007": {
        code: "TEMPLATE_POLICY_VIOLATION",
        message: "o conteúdo do modelo viola a política do WhatsApp",
        scope: "TEMPLATE",
    },
    "132015": {
        code: "TEMPLATE_PAUSED",
        message: "o modelo de aviso foi pausado pela Meta por baixa qualidade",
        scope: "TEMPLATE",
    },
    "132016": {
        code: "TEMPLATE_DISABLED",
        message: "o modelo de aviso foi desativado de vez pela Meta (é preciso criar um novo, com conteúdo diferente)",
        scope: "TEMPLATE",
    },
    "132005": {
        code: "TEMPLATE_TRANSLATION_TOO_LONG",
        message: "a tradução do texto do modelo ficou longa demais",
        scope: "TEMPLATE",
    },
}

export const PROBLEM_ERROR_CODES = Object.keys(RULES)

const INVALID_TOKEN_MESSAGE = (RULES["190"] as ProblemRule).message

function succeededAfter(signals: DeliveryProblemSignals, kinds: OutboundKind[] | null, failedAt: Date): boolean {
    return Object.entries(signals.lastSuccessByKind).some(
        ([kind, at]) => (kinds === null || kinds.includes(kind as OutboundKind)) && at !== undefined && at.getTime() > failedAt.getTime(),
    )
}

export function decideCancellationNoticeProblem({
    signals,
    credentialsValid,
}: {
    signals: DeliveryProblemSignals
    credentialsValid: boolean | null
}): CancellationNoticeProblem | null {
    const ordered = [...signals.failures].sort((a, b) => b.failedAt.getTime() - a.failedAt.getTime())
    for (const failure of ordered) {
        const rule = RULES[failure.errorCode]
        if (rule === undefined) {
            continue
        }
        if (rule.scope === "TEMPLATE" && failure.kind !== "CANCELLATION") {
            continue
        }
        const cleared = succeededAfter(signals, rule.scope === "TEMPLATE" ? ["CANCELLATION"] : null, failure.failedAt)
        if (!cleared) {
            return { code: rule.code, metaErrorCode: failure.errorCode, message: rule.message }
        }
    }
    if (credentialsValid === false) {
        return { code: "INVALID_TOKEN", metaErrorCode: null, message: INVALID_TOKEN_MESSAGE }
    }
    return null
}
