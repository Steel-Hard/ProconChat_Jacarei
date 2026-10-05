import { hashPhone } from "./whatsappSession.service"
import {
  ActiveSession,
  sessionRepository,
  SessionDraft,
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
  ERRO_ATTENDEE,
  ERRO_CPF,
  ERRO_DUPLICATE_APPOINTMENT,
  ERRO_NOME,
  ERRO_OFERTA_AGENDAMENTO,
  ERRO_RESOLVIDA,
  ERRO_SLOT_OCUPADO,
  formatarCategoriaSemPerguntas,
  formatarConfirmacaoAgendamento,
  formatarErroCategoria,
  formatarErroPergunta,
  formatarErroSlot,
  formatarListaCategorias,
  formatarListaPerguntas,
  formatarListaSlots,
  formatarRespostaFinal,
  MENSAGEM_SEM_HORARIOS,
  OFERTA_AGENDAMENTO,
  paginarItens,
  PERGUNTA_RESOLVIDA,
  PROMPT_CPF,
  PROMPT_NOME,
  RESPOSTA_INICIO_AGENDAMENTO,
  RESPOSTA_RECUSA_AGENDAMENTO,
  RESPOSTA_RESOLVIDA_SIM,
} from "./messageFormatter.service"
import { cleanCpf, hashCpf, maskCpf, validateCpf } from "../utils/cpf.utils"
import {
  AvailableSlot,
  BookAppointmentInput,
  BookAppointmentResult,
} from "../types/schedule.types"
import { ScheduleService } from "./schedule.service"
import { PgScheduleRepository } from "../repositories/schedule.repository"

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

export interface ScheduleProvider {
  getAvailableSlots(now?: Date): Promise<AvailableSlot[]>
  bookSlot(input: BookAppointmentInput): Promise<BookAppointmentResult>
}

interface ConversationFlowDependencies {
  sessions: SessionRepository
  motor: MotorDecisao
  schedule: ScheduleProvider
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
  schedule,
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
      draft: null,
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

  async function handleAwaitingAttendee(
    sessionId: string,
    draft: SessionDraft | null | undefined,
    text: string | undefined,
  ): Promise<ConversationFlowResult> {
    const trimmed = text?.trim()

    if (trimmed !== "1" && trimmed !== "2") {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: ERRO_ATTENDEE,
          step: "AWAITING_ATTENDEE",
        },
      }
    }

    const byRepresentative = trimmed === "2"
    await sessions.updateNavigationState(sessionId, {
      currentStep: "AWAITING_HOLDER_NAME",
      draft: {
        ...draft,
        by_representative: byRepresentative,
      },
    })

    return {
      sessionId,
      newSession: false,
      reply: {
        text: PROMPT_NOME,
        step: "AWAITING_HOLDER_NAME",
      },
    }
  }

  async function handleAwaitingHolderName(
    sessionId: string,
    draft: SessionDraft | null | undefined,
    text: string | undefined,
  ): Promise<ConversationFlowResult> {
    const name = text?.trim()

    if (!name || name.length < 2 || name.length > 150) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: ERRO_NOME,
          step: "AWAITING_HOLDER_NAME",
        },
      }
    }

    await sessions.updateNavigationState(sessionId, {
      currentStep: "AWAITING_HOLDER_CPF",
      draft: {
        ...draft,
        holder_name: name,
      },
    })

    return {
      sessionId,
      newSession: false,
      reply: {
        text: PROMPT_CPF,
        step: "AWAITING_HOLDER_CPF",
      },
    }
  }

  async function handleAwaitingHolderCpf(
    sessionId: string,
    draft: SessionDraft | null | undefined,
    text: string | undefined,
  ): Promise<ConversationFlowResult> {
    if (!validateCpf(text)) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: ERRO_CPF,
          step: "AWAITING_HOLDER_CPF",
        },
      }
    }

    const cleaned = cleanCpf(text!)
    const cpfHash = hashCpf(cleaned)
    const cpfMasked = maskCpf(cleaned)

    const updatedDraft: SessionDraft = {
      ...draft,
      cpf_hash: cpfHash,
      cpf_masked: cpfMasked,
    }

    // Busca horários livres para agendamento
    const slots = await schedule.getAvailableSlots()

    if (slots.length === 0) {
      // Agenda lotada / sem horário disponível na janela (Decisão 008, outcome NO_SLOT)
      await sessions.finish(sessionId, "NO_SLOT")
      return {
        sessionId,
        newSession: false,
        reply: {
          text: MENSAGEM_SEM_HORARIOS,
          step: "FINISHED",
        },
      }
    }

    await sessions.updateNavigationState(sessionId, {
      currentStep: "AWAITING_SLOT",
      listPage: 1,
      draft: updatedDraft,
    })

    return {
      sessionId,
      newSession: false,
      reply: {
        text: formatarListaSlots(slots, 1),
        step: "AWAITING_SLOT",
      },
    }
  }

  async function handleAwaitingSlot(
    session: ActiveSession,
    phone: string,
    text: string | undefined,
  ): Promise<ConversationFlowResult> {
    const slots = await schedule.getAvailableSlots()

    if (slots.length === 0) {
      await sessions.finish(session.id, "NO_SLOT")
      return {
        sessionId: session.id,
        newSession: false,
        reply: {
          text: MENSAGEM_SEM_HORARIOS,
          step: "FINISHED",
        },
      }
    }

    const currentPage = session.listPage || 1
    const paginacao = paginarItens(slots, currentPage)
    const escolha = parseOption(text)

    if (escolha === null) {
      return {
        sessionId: session.id,
        newSession: false,
        reply: {
          text: formatarErroSlot(slots, paginacao.paginaAtual),
          step: "AWAITING_SLOT",
        },
      }
    }

    // Navegação: Ver mais opções
    if (paginacao.opcaoProxima !== undefined && escolha === paginacao.opcaoProxima) {
      const nextPage = paginacao.paginaAtual + 1
      await sessions.updateNavigationState(session.id, {
        currentStep: "AWAITING_SLOT",
        listPage: nextPage,
      })
      return {
        sessionId: session.id,
        newSession: false,
        reply: {
          text: formatarListaSlots(slots, nextPage),
          step: "AWAITING_SLOT",
        },
      }
    }

    // Navegação: Voltar opções
    if (paginacao.opcaoAnterior !== undefined && escolha === paginacao.opcaoAnterior) {
      const prevPage = paginacao.paginaAtual - 1
      await sessions.updateNavigationState(session.id, {
        currentStep: "AWAITING_SLOT",
        listPage: prevPage,
      })
      return {
        sessionId: session.id,
        newSession: false,
        reply: {
          text: formatarListaSlots(slots, prevPage),
          step: "AWAITING_SLOT",
        },
      }
    }

    // Escolha de um slot na página atual
    if (escolha < 1 || escolha > paginacao.itensPagina.length) {
      return {
        sessionId: session.id,
        newSession: false,
        reply: {
          text: formatarErroSlot(slots, paginacao.paginaAtual),
          step: "AWAITING_SLOT",
        },
      }
    }

    const chosenSlot = paginacao.itensPagina[escolha - 1]
    if (!chosenSlot) {
      return {
        sessionId: session.id,
        newSession: false,
        reply: {
          text: formatarErroSlot(slots, paginacao.paginaAtual),
          step: "AWAITING_SLOT",
        },
      }
    }

    const questionId = Number(session.currentQuestionId ?? 1)
    const perguntaResp = await motor.processarPergunta(questionId)
    const reason = perguntaResp.requer_presencial
      ? "REQUIRES_IN_PERSON"
      : "NOT_RESOLVED"

    try {
      const bookResult = await schedule.bookSlot({
        sessionId: session.id,
        questionId,
        reason,
        name: session.draft?.holder_name ?? "Cidadão",
        cpfHash: session.draft?.cpf_hash ?? "",
        cpfMasked: session.draft?.cpf_masked ?? "",
        phone,
        byRepresentative: session.draft?.by_representative ?? false,
        appointmentDatetime: chosenSlot.datetime,
      })

      const confirmationText = formatarConfirmacaoAgendamento({
        protocol: bookResult.protocol,
        quando: chosenSlot.formatted,
        unitAddress: bookResult.unitAddress,
        unitAddressComplement: bookResult.unitAddressComplement,
        byRepresentative: session.draft?.by_representative ?? false,
        groupDocuments: bookResult.documentsSent.group,
        questionDocuments: bookResult.documentsSent.question,
        reminderEnabled: bookResult.reminderEnabled,
        reminderHours: bookResult.reminderHours,
      })

      return {
        sessionId: session.id,
        newSession: false,
        reply: {
          text: confirmationText,
          step: "FINISHED",
        },
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "SLOT_FULL") {
        const updatedSlots = await schedule.getAvailableSlots()
        if (updatedSlots.length === 0) {
          await sessions.finish(session.id, "NO_SLOT")
          return {
            sessionId: session.id,
            newSession: false,
            reply: {
              text: MENSAGEM_SEM_HORARIOS,
              step: "FINISHED",
            },
          }
        }
        return {
          sessionId: session.id,
          newSession: false,
          reply: {
            text: `${ERRO_SLOT_OCUPADO}\n${formatarListaSlots(updatedSlots, 1)}`,
            step: "AWAITING_SLOT",
          },
        }
      }

      if (err instanceof Error && err.message === "DUPLICATE_APPOINTMENT") {
        return {
          sessionId: session.id,
          newSession: false,
          reply: {
            text: `${ERRO_DUPLICATE_APPOINTMENT}\n${formatarListaSlots(slots, currentPage)}`,
            step: "AWAITING_SLOT",
          },
        }
      }

      throw err
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

    if (session.currentStep === "AWAITING_ATTENDEE") {
      return handleAwaitingAttendee(session.id, session.draft, text)
    }

    if (session.currentStep === "AWAITING_HOLDER_NAME") {
      return handleAwaitingHolderName(session.id, session.draft, text)
    }

    if (session.currentStep === "AWAITING_HOLDER_CPF") {
      return handleAwaitingHolderCpf(
        session.id,
        session.draft,
        text,
      )
    }

    if (session.currentStep === "AWAITING_SLOT") {
      return handleAwaitingSlot(session, phone, text)
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
  schedule: new ScheduleService(new PgScheduleRepository()),
  hashPhone,
})