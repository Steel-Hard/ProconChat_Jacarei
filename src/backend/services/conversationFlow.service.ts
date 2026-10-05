import { hashPhone } from "./whatsappSession.service"
import {
  sessionRepository,
  SessionRepository,
  SessionStep,
} from "../repositories/session.repository"
import { MotorDecisaoService } from "./motorDecisao.service"
import { PgMotorDecisaoRepository } from "../repositories/motorDecisao.repository"
import {
  Categoria,
  Pergunta,
  RespostaFinalOutput,
} from "../types/motorDecisao.types"
import {
  ERRO_OFERTA_AGENDAMENTO,
  ERRO_RESOLVIDA,
  formatarCategoriaSemPerguntas,
  formatarErroCategoria,
  formatarErroPergunta,
  formatarListaCategorias,
  formatarListaPerguntas,
  formatarRespostaFinal,
  OFERTA_AGENDAMENTO,
  paginarItens,
  PERGUNTA_RESOLVIDA,
  RESPOSTA_INICIO_AGENDAMENTO,
  RESPOSTA_RECUSA_AGENDAMENTO,
  RESPOSTA_RESOLVIDA_SIM,
} from "./messageFormatter.service"

export interface ConversationFlowInput {
  phone: string
  text?: string
}

export interface ConversationFlowReply {
  text: string
  step: SessionStep
}

export interface ConversationFlowResult {
  sessionId: string
  newSession: boolean
  reply: ConversationFlowReply
}

export interface MotorDecisao {
  iniciarSessao(): Promise<Categoria[]>
  escolherCategoria(categoriaId: number): Promise<Pergunta[]>
  processarPergunta(perguntaId: number): Promise<RespostaFinalOutput>
}

interface ConversationFlowDependencies {
  sessions: SessionRepository
  motor: MotorDecisao
  hashPhone: (phone: string) => string
}

function parseOption(text: string | undefined): number | null {
  if (!text) {
    return null
  }

  const trimmed = text.trim()

  if (!/^\d+$/.test(trimmed)) {
    return null
  }

  const value = Number(trimmed)
  return value > 0 ? value : null
}

function createPhoneLock() {
  const locks = new Map<string, Promise<void>>()

  return async function withPhoneLock<T>(
    phone: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    const previous = locks.get(phone) ?? Promise.resolve()

    let release!: () => void

    const current = new Promise<void>((resolve) => {
      release = resolve
    })

    locks.set(phone, current)

    await previous

    try {
      return await callback()
    } finally {
      release()

      if (locks.get(phone) === current) {
        locks.delete(phone)
      }
    }
  }
}

export function createConversationFlowService({
  sessions,
  motor,
  hashPhone: hashPhoneOf,
}: ConversationFlowDependencies): (
  input: ConversationFlowInput,
) => Promise<ConversationFlowResult> {
  const withPhoneLock = createPhoneLock()

  async function startOver(
    sessionId: string,
    newSession: boolean,
  ): Promise<ConversationFlowResult> {
    const categorias = await motor.iniciarSessao()

    await sessions.updateNavigationState(sessionId, {
      currentStep: "AWAITING_CATEGORY",
      currentCategoryId: null,
      currentQuestionId: null,
      listPage: 1,
    })

    return {
      sessionId,
      newSession,
      reply: {
        text: formatarListaCategorias(categorias, 1),
        step: "AWAITING_CATEGORY",
      },
    }
  }

  async function handleAwaitingCategory(
    sessionId: string,
    currentPage: number = 1,
    text: string | undefined,
  ): Promise<ConversationFlowResult> {
    const categorias = await motor.iniciarSessao()
    const paginacao = paginarItens(categorias, currentPage)
    const escolha = parseOption(text)

    if (escolha === null) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarErroCategoria(categorias, paginacao.paginaAtual),
          step: "AWAITING_CATEGORY",
        },
      }
    }

    // Navegação: Ver mais opções
    if (paginacao.opcaoProxima !== undefined && escolha === paginacao.opcaoProxima) {
      const nextPage = paginacao.paginaAtual + 1
      await sessions.updateNavigationState(sessionId, {
        currentStep: "AWAITING_CATEGORY",
        listPage: nextPage,
      })
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarListaCategorias(categorias, nextPage),
          step: "AWAITING_CATEGORY",
        },
      }
    }

    // Navegação: Voltar opções
    if (paginacao.opcaoAnterior !== undefined && escolha === paginacao.opcaoAnterior) {
      const prevPage = paginacao.paginaAtual - 1
      await sessions.updateNavigationState(sessionId, {
        currentStep: "AWAITING_CATEGORY",
        listPage: prevPage,
      })
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarListaCategorias(categorias, prevPage),
          step: "AWAITING_CATEGORY",
        },
      }
    }

    // Escolha de uma categoria na página atual
    if (escolha < 1 || escolha > paginacao.itensPagina.length) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarErroCategoria(categorias, paginacao.paginaAtual),
          step: "AWAITING_CATEGORY",
        },
      }
    }

    const categoria = paginacao.itensPagina[escolha - 1]
    if (!categoria) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarErroCategoria(categorias, paginacao.paginaAtual),
          step: "AWAITING_CATEGORY",
        },
      }
    }

    const perguntas = await motor.escolherCategoria(categoria.id)

    if (perguntas.length === 0) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarCategoriaSemPerguntas(),
          step: "AWAITING_CATEGORY",
        },
      }
    }

    await sessions.updateNavigationState(sessionId, {
      currentStep: "AWAITING_QUESTION",
      currentCategoryId: String(categoria.id),
      listPage: 1,
    })

    return {
      sessionId,
      newSession: false,
      reply: {
        text: formatarListaPerguntas(perguntas, 1),
        step: "AWAITING_QUESTION",
      },
    }
  }

  async function handleAwaitingQuestion(
    sessionId: string,
    currentCategoryId: string | null,
    currentPage: number = 1,
    text: string | undefined,
  ): Promise<ConversationFlowResult> {
    if (!currentCategoryId) {
      return startOver(sessionId, false)
    }

    const perguntas = await motor.escolherCategoria(Number(currentCategoryId))
    const paginacao = paginarItens(perguntas, currentPage)
    const escolha = parseOption(text)

    if (escolha === null) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarErroPergunta(perguntas, paginacao.paginaAtual),
          step: "AWAITING_QUESTION",
        },
      }
    }

    // Navegação: Ver mais opções
    if (paginacao.opcaoProxima !== undefined && escolha === paginacao.opcaoProxima) {
      const nextPage = paginacao.paginaAtual + 1
      await sessions.updateNavigationState(sessionId, {
        currentStep: "AWAITING_QUESTION",
        currentCategoryId,
        listPage: nextPage,
      })
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarListaPerguntas(perguntas, nextPage),
          step: "AWAITING_QUESTION",
        },
      }
    }

    // Navegação: Voltar opções
    if (paginacao.opcaoAnterior !== undefined && escolha === paginacao.opcaoAnterior) {
      const prevPage = paginacao.paginaAtual - 1
      await sessions.updateNavigationState(sessionId, {
        currentStep: "AWAITING_QUESTION",
        currentCategoryId,
        listPage: prevPage,
      })
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarListaPerguntas(perguntas, prevPage),
          step: "AWAITING_QUESTION",
        },
      }
    }

    // Escolha de uma pergunta na página atual
    if (escolha < 1 || escolha > paginacao.itensPagina.length) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarErroPergunta(perguntas, paginacao.paginaAtual),
          step: "AWAITING_QUESTION",
        },
      }
    }

    const pergunta = paginacao.itensPagina[escolha - 1]
    if (!pergunta) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarErroPergunta(perguntas, paginacao.paginaAtual),
          step: "AWAITING_QUESTION",
        },
      }
    }

    const resposta = await motor.processarPergunta(pergunta.id)

    // Caso 1: Fora do escopo do PROCON (Decisão 008)
    if (resposta.fora_de_escopo) {
      await sessions.finish(sessionId, "OUT_OF_SCOPE")
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarRespostaFinal(resposta),
          step: "FINISHED",
        },
      }
    }

    // Caso 2: Exige atendimento presencial (Decisão 008: oferece agendamento direto sem perguntar se resolveu)
    if (resposta.requer_presencial) {
      await sessions.updateNavigationState(sessionId, {
        currentStep: "AWAITING_SCHEDULE_OFFER",
        currentQuestionId: String(pergunta.id),
      })
      return {
        sessionId,
        newSession: false,
        reply: {
          text: `${formatarRespostaFinal(resposta)}\n\n${OFERTA_AGENDAMENTO}`,
          step: "AWAITING_SCHEDULE_OFFER",
        },
      }
    }

    // Caso 3: Pergunta padrão -> Pergunta se a dúvida foi resolvida
    await sessions.updateNavigationState(sessionId, {
      currentStep: "AWAITING_RESOLVED",
      currentQuestionId: String(pergunta.id),
    })

    return {
      sessionId,
      newSession: false,
      reply: {
        text: `${formatarRespostaFinal(resposta)}\n\n${PERGUNTA_RESOLVIDA}`,
        step: "AWAITING_RESOLVED",
      },
    }
  }

  async function handleAwaitingResolved(
    sessionId: string,
    text: string | undefined,
  ): Promise<ConversationFlowResult> {
    const trimmed = text?.trim()

    if (trimmed === "1") {
      // Dúvida resolvida com sucesso
      await sessions.finish(sessionId, "RESOLVED")
      return {
        sessionId,
        newSession: false,
        reply: {
          text: RESPOSTA_RESOLVIDA_SIM,
          step: "FINISHED",
        },
      }
    }

    if (trimmed === "2") {
      // Dúvida não resolvida -> Oferece agendamento presencial
      await sessions.updateNavigationState(sessionId, {
        currentStep: "AWAITING_SCHEDULE_OFFER",
      })
      return {
        sessionId,
        newSession: false,
        reply: {
          text: OFERTA_AGENDAMENTO,
          step: "AWAITING_SCHEDULE_OFFER",
        },
      }
    }

    return {
      sessionId,
      newSession: false,
      reply: {
        text: ERRO_RESOLVIDA,
        step: "AWAITING_RESOLVED",
      },
    }
  }

  async function handleAwaitingScheduleOffer(
    sessionId: string,
    text: string | undefined,
  ): Promise<ConversationFlowResult> {
    const trimmed = text?.trim()

    if (trimmed === "2") {
      // Não quis agendar
      await sessions.finish(sessionId, "DECLINED")
      return {
        sessionId,
        newSession: false,
        reply: {
          text: RESPOSTA_RECUSA_AGENDAMENTO,
          step: "FINISHED",
        },
      }
    }

    if (trimmed === "1") {
      // Deseja agendar -> Avança para o fluxo de coleta de dados do agendamento (#56)
      await sessions.updateNavigationState(sessionId, {
        currentStep: "AWAITING_ATTENDEE",
      })
      return {
        sessionId,
        newSession: false,
        reply: {
          text: RESPOSTA_INICIO_AGENDAMENTO,
          step: "AWAITING_ATTENDEE",
        },
      }
    }

    return {
      sessionId,
      newSession: false,
      reply: {
        text: ERRO_OFERTA_AGENDAMENTO,
        step: "AWAITING_SCHEDULE_OFFER",
      },
    }
  }

  async function processMessage({
    phone,
    text,
  }: ConversationFlowInput): Promise<ConversationFlowResult> {
    const session = await sessions.findOrCreateActive(hashPhoneOf(phone))

    if (session.created || session.currentStep === "FINISHED") {
      return startOver(session.id, session.created)
    }

    const page = session.listPage || 1

    if (session.currentStep === "AWAITING_CATEGORY") {
      return handleAwaitingCategory(session.id, page, text)
    }

    if (session.currentStep === "AWAITING_QUESTION") {
      return handleAwaitingQuestion(
        session.id,
        session.currentCategoryId,
        page,
        text,
      )
    }

    if (session.currentStep === "AWAITING_RESOLVED") {
      return handleAwaitingResolved(session.id, text)
    }

    if (session.currentStep === "AWAITING_SCHEDULE_OFFER") {
      return handleAwaitingScheduleOffer(session.id, text)
    }

    // Se estiver em outro step futuro ou inesperado, recomeça
    return startOver(session.id, false)
  }

  return async (input: ConversationFlowInput): Promise<ConversationFlowResult> => {
    const phone = input.phone.trim()

    if (!phone) {
      throw new Error("Phone is required")
    }

    return withPhoneLock(phone, () => processMessage(input))
  }
}

export const processIncomingMessage = createConversationFlowService({
  sessions: sessionRepository,
  motor: new MotorDecisaoService(new PgMotorDecisaoRepository()),
  hashPhone,
})