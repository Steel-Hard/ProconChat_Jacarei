import { hashPhone } from "./whatsappSession.service";
import {
  sessionRepository,
  SessionRepository,
  SessionStep,
} from "../repositories/session.repository";
import { MotorDecisaoService } from "./motorDecisao.service";
import { PgMotorDecisaoRepository } from "../repositories/motorDecisao.repository";
import {
  Categoria,
  Pergunta,
  RespostaFinalOutput,
} from "../types/motorDecisao.types";
import {
  formatarCategoriaSemPerguntas,
  formatarErroCategoria,
  formatarErroPergunta,
  formatarListaCategorias,
  formatarListaPerguntas,
  formatarRespostaFinal,
} from "./messageFormatter.service";

export interface ConversationFlowInput {
  phone: string;
  text?: string;
}

export interface ConversationFlowReply {
  text: string;
  step: SessionStep;
}

export interface ConversationFlowResult {
  sessionId: string;
  newSession: boolean;
  reply: ConversationFlowReply;
}

export interface MotorDecisao {
  iniciarSessao(): Promise<Categoria[]>;
  escolherCategoria(categoriaId: number): Promise<Pergunta[]>;
  processarPergunta(perguntaId: number): Promise<RespostaFinalOutput>;
}

interface ConversationFlowDependencies {
  sessions: SessionRepository;
  motor: MotorDecisao;
  hashPhone: (phone: string) => string;
}

function parseOption(text: string | undefined, max: number): number | null {
  if (!text || max <= 0) {
    return null;
  }

  const trimmed = text.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const value = Number(trimmed);

  if (value < 1 || value > max) {
    return null;
  }

  return value;
}

function createPhoneLock() {
  const locks = new Map<string, Promise<void>>();

  return async function withPhoneLock<T>(
    phone: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    const previous = locks.get(phone) ?? Promise.resolve();

    let release!: () => void;

    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    locks.set(phone, current);

    await previous;

    try {
      return await callback();
    } finally {
      release();

      if (locks.get(phone) === current) {
        locks.delete(phone);
      }
    }
  };
}

export function createConversationFlowService({
  sessions,
  motor,
  hashPhone,
}: ConversationFlowDependencies): (
  input: ConversationFlowInput,
) => Promise<ConversationFlowResult> {
  const withPhoneLock = createPhoneLock();

  async function startOver(
    sessionId: string,
    newSession: boolean,
  ): Promise<ConversationFlowResult> {
    const categorias = await motor.iniciarSessao();

    return {
      sessionId,
      newSession,
      reply: {
        text: formatarListaCategorias(categorias),
        step: "AWAITING_CATEGORY",
      },
    };
  }

  async function handleAwaitingCategory(
    sessionId: string,
    text: string | undefined,
  ): Promise<ConversationFlowResult> {
    const categorias = await motor.iniciarSessao();
    const escolha = parseOption(text, categorias.length);

    if (escolha === null) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarErroCategoria(categorias),
          step: "AWAITING_CATEGORY",
        },
      };
    }

    const categoria = categorias[escolha - 1];

    if (!categoria) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarErroCategoria(categorias),
          step: "AWAITING_CATEGORY",
        },
      };
    }

    const perguntas = await motor.escolherCategoria(categoria.id);

    if (perguntas.length === 0) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarCategoriaSemPerguntas(),
          step: "AWAITING_CATEGORY",
        },
      };
    }

    await sessions.updateNavigationState(sessionId, {
      currentStep: "AWAITING_QUESTION",
      currentCategoryId: String(categoria.id),
    });

    return {
      sessionId,
      newSession: false,
      reply: {
        text: formatarListaPerguntas(perguntas),
        step: "AWAITING_QUESTION",
      },
    };
  }

  async function handleAwaitingQuestion(
    sessionId: string,
    currentCategoryId: string | null,
    text: string | undefined,
  ): Promise<ConversationFlowResult> {
    if (!currentCategoryId) {
      return startOver(sessionId, false);
    }

    const perguntas = await motor.escolherCategoria(Number(currentCategoryId));
    const escolha = parseOption(text, perguntas.length);

    if (escolha === null) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarErroPergunta(perguntas),
          step: "AWAITING_QUESTION",
        },
      };
    }

    const pergunta = perguntas[escolha - 1];

    if (!pergunta) {
      return {
        sessionId,
        newSession: false,
        reply: {
          text: formatarErroPergunta(perguntas),
          step: "AWAITING_QUESTION",
        },
      };
    }

    const resposta = await motor.processarPergunta(pergunta.id);

    await sessions.finish(sessionId);

    return {
      sessionId,
      newSession: false,
      reply: {
        text: formatarRespostaFinal(resposta),
        step: "FINISHED",
      },
    };
  }

  async function processMessage({
    phone,
    text,
  }: ConversationFlowInput): Promise<ConversationFlowResult> {
    const session = await sessions.findOrCreateActive(hashPhone(phone));

    if (session.created || session.currentStep === "FINISHED") {
      return startOver(session.id, session.created);
    }

    if (session.currentStep === "AWAITING_CATEGORY") {
      return handleAwaitingCategory(session.id, text);
    }

    return handleAwaitingQuestion(
      session.id,
      session.currentCategoryId,
      text,
    );
  }

  return async (input: ConversationFlowInput): Promise<ConversationFlowResult> => {
    const phone = input.phone.trim();

    if (!phone) {
      throw new Error("Phone is required");
    }

    return withPhoneLock(phone, () => processMessage(input));
  };
}

export const processIncomingMessage = createConversationFlowService({
  sessions: sessionRepository,
  motor: new MotorDecisaoService(new PgMotorDecisaoRepository()),
  hashPhone,
});