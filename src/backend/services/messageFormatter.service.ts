import { OutgoingMessage, ListRow, ReplyButton } from "../types/message.types"
import { Categoria, Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import { AvailableSlot } from "../types/schedule.types"

export const SAUDACAO =
    "Olá! Sou o assistente virtual do PROCON Jacareí. As orientações a seguir têm caráter informativo e não substituem o atendimento formal.\n\n" +
    "🔒 Privacidade (LGPD): utilizamos o identificador do seu telefone de forma anonimizada e as opções selecionadas exclusivamente para prestar este atendimento e orientar sua dúvida. Não armazenamos mensagens de texto abertas.\n\n" +
    "Escolha uma das opções abaixo digitando o número correspondente:"

export const ERRO_PREFIXO = "Não entendi. Digite o número de uma das opções abaixo:"

export const AVISO_NAO_VINCULANTE =
    "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."

export const PERGUNTA_RESOLVIDA =
    "A dúvida foi resolvida?\n1. Sim\n2. Não"

export const ERRO_RESOLVIDA =
    "Não entendi. Por favor, responda se a dúvida foi resolvida digitando o número:\n1. Sim\n2. Não"

export const RESPOSTA_RESOLVIDA_SIM =
    "Que bom que conseguimos ajudar! O PROCON Jacareí agradece seu contato. Se precisar de mais alguma orientação, é só mandar uma nova mensagem."

export const OFERTA_AGENDAMENTO =
    "Deseja agendar um atendimento presencial no PROCON Jacareí?\n1. Agendar atendimento presencial\n2. Agora não"

export const ERRO_OFERTA_AGENDAMENTO =
    "Não entendi. Por favor, escolha uma das opções digitando o número:\n1. Agendar atendimento presencial\n2. Agora não"

export const RESPOSTA_RECUSA_AGENDAMENTO =
    "Tudo bem! Se mudar de ideia ou precisar de novas orientações, estamos à sua disposição. O PROCON Jacareí agradece seu contato."

export const RESPOSTA_INICIO_AGENDAMENTO =
    "Vamos iniciar o agendamento presencial. Quem irá comparecer ao atendimento?\n1. Eu mesmo\n2. Um representante"

export const ERRO_ATTENDEE =
    "Não entendi. Por favor, escolha quem comparecerá digitando o número:\n1. Eu mesmo\n2. Um representante"

export const PROMPT_NOME =
    "Por favor, digite o nome completo do titular do atendimento:"

export const ERRO_NOME =
    "Por favor, digite um nome válido (entre 2 e 150 caracteres):"

export const PROMPT_CPF =
    "Agora, digite o CPF do titular (somente os 11 números ou com pontos e traço):"

export const ERRO_CPF =
    "CPF inválido. Por favor, digite um CPF válido com 11 dígitos:"

export const MENSAGEM_SEM_HORARIOS =
    "No momento não há horários disponíveis para agendamento presencial na janela de atendimento. Por favor, tente novamente mais tarde."

export const ERRO_SLOT_OCUPADO =
    "O horário selecionado acabou de ser preenchido por outro atendimento. Por favor, escolha outro horário disponível:"

export const ERRO_DUPLICATE_APPOINTMENT =
    "Você já possui um agendamento ativo para este mesmo horário. Por favor, escolha outro horário disponível:"

export const ERRO_FALHA_AGENDAMENTO =
    "Não foi possível concluir o seu agendamento no momento devido a uma instabilidade. O agendamento não foi gravado. Por favor, tente novamente mais tarde."

export const PROMPT_SLOTS =
    "Escolha um dos horários disponíveis para o atendimento presencial:"

export const ERRO_SLOTS =
    "Não entendi. Por favor, escolha um dos horários digitando o número:"

export interface ConfirmacaoAgendamentoInput {
    protocol: string
    quando: string
    unitAddress: string
    unitAddressComplement?: string | null
    byRepresentative: boolean
    groupDocuments: string[]
    questionDocuments: string[]
    reminderEnabled: boolean
    reminderHours: number
}

export interface PaginatedResult<T> {
    itensPagina: T[]
    paginaAtual: number
    totalPaginas: number
    temProxima: boolean
    temAnterior: boolean
    opcaoProxima?: number
    opcaoAnterior?: number
}

/**
 * Regra da Decisão 001:
 * - Total <= 10: página única (todos os itens de 1 a N).
 * - Total > 10:
 *   - Página 1: 9 itens + "Ver mais opções" (opção 10).
 *   - Páginas intermediárias: 8 itens + "Voltar" + "Ver mais opções".
 *   - Última página: até 9 itens + "Voltar".
 */
export function paginarItens<T>(itens: T[], paginaSolicitada: number = 1): PaginatedResult<T> {
    const total = itens.length
    if (total <= 10) {
        return {
            itensPagina: itens,
            paginaAtual: 1,
            totalPaginas: 1,
            temProxima: false,
            temAnterior: false,
        }
    }

    const paginasBounds: { start: number; end: number }[] = []
    let offset = 0
    let p = 1

    while (offset < total) {
        const restantes = total - offset
        if (p === 1) {
            paginasBounds.push({ start: 0, end: 9 })
            offset = 9
        } else {
            if (restantes <= 9) {
                paginasBounds.push({ start: offset, end: total })
                offset = total
            } else {
                paginasBounds.push({ start: offset, end: offset + 8 })
                offset += 8
            }
        }
        p++
    }

    const totalPaginas = paginasBounds.length
    const paginaAtual = Math.max(1, Math.min(paginaSolicitada, totalPaginas))
    const bounds = paginasBounds[paginaAtual - 1] ?? { start: 0, end: total }
    const itensPagina = itens.slice(bounds.start, bounds.end)

    const temAnterior = paginaAtual > 1
    const temProxima = paginaAtual < totalPaginas

    let opcaoAnterior: number | undefined
    let opcaoProxima: number | undefined

    if (paginaAtual === 1) {
        opcaoProxima = itensPagina.length + 1
    } else if (paginaAtual < totalPaginas) {
        opcaoAnterior = itensPagina.length + 1
        opcaoProxima = itensPagina.length + 2
    } else {
        opcaoAnterior = itensPagina.length + 1
    }

    return {
        itensPagina,
        paginaAtual,
        totalPaginas,
        temProxima,
        temAnterior,
        opcaoProxima,
        opcaoAnterior,
    }
}

export function formatarListaPaginada(
    paginacao: PaginatedResult<string>,
): string {
    const linhas: string[] = []
    paginacao.itensPagina.forEach((item, index) => {
        linhas.push(`${index + 1}. ${item}`)
    })

    if (paginacao.opcaoAnterior !== undefined && paginacao.opcaoProxima !== undefined) {
        linhas.push(`${paginacao.opcaoAnterior}. Voltar para opções anteriores`)
        linhas.push(`${paginacao.opcaoProxima}. Ver mais opções`)
    } else if (paginacao.opcaoProxima !== undefined) {
        linhas.push(`${paginacao.opcaoProxima}. Ver mais opções`)
    } else if (paginacao.opcaoAnterior !== undefined) {
        linhas.push(`${paginacao.opcaoAnterior}. Voltar para opções anteriores`)
    }

    return linhas.join("\n")
}

export function formatarListaCategorias(
    categorias: Categoria[],
    pagina: number = 1,
): string {
    if (categorias.length === 0) {
        return "Olá! Sou o assistente virtual do PROCON Jacareí. Nosso catálogo de orientações está em atualização no momento. Por favor, tente novamente em instantes."
    }

    const titulos = categorias.map((c) => c.title)
    const paginacao = paginarItens(titulos, pagina)
    const listaFormatada = formatarListaPaginada(paginacao)

    return `${SAUDACAO}\n${listaFormatada}`
}

export function formatarErroCategoria(
    categorias: Categoria[],
    pagina: number = 1,
): string {
    if (categorias.length === 0) {
        return "Nosso catálogo de orientações está em atualização no momento. Por favor, tente novamente em instantes."
    }

    const titulos = categorias.map((c) => c.title)
    const paginacao = paginarItens(titulos, pagina)
    const listaFormatada = formatarListaPaginada(paginacao)

    return `${ERRO_PREFIXO}\n${listaFormatada}`
}

export function formatarListaPerguntas(
    perguntas: Pergunta[],
    pagina: number = 1,
): string {
    const titulos = perguntas.map((p) => p.question)
    const paginacao = paginarItens(titulos, pagina)
    const listaFormatada = formatarListaPaginada(paginacao)

    return `Escolha uma das perguntas abaixo digitando o número correspondente:\n${listaFormatada}`
}

export function formatarErroPergunta(
    perguntas: Pergunta[],
    pagina: number = 1,
): string {
    const titulos = perguntas.map((p) => p.question)
    const paginacao = paginarItens(titulos, pagina)
    const listaFormatada = formatarListaPaginada(paginacao)

    return `${ERRO_PREFIXO}\n${listaFormatada}`
}

export function formatarCategoriaSemPerguntas(): string {
    return "No momento não há perguntas cadastradas para essa categoria. Digite o número de outra categoria."
}

export function formatarListaSlots(
    slots: AvailableSlot[],
    pagina: number = 1,
): string {
    if (slots.length === 0) {
        return MENSAGEM_SEM_HORARIOS
    }

    const formatados = slots.map((s) => s.formatted)
    const paginacao = paginarItens(formatados, pagina)
    const listaFormatada = formatarListaPaginada(paginacao)

    return `${PROMPT_SLOTS}\n${listaFormatada}`
}

export function formatarErroSlot(
    slots: AvailableSlot[],
    pagina: number = 1,
): string {
    if (slots.length === 0) {
        return MENSAGEM_SEM_HORARIOS
    }

    const formatados = slots.map((s) => s.formatted)
    const paginacao = paginarItens(formatados, pagina)
    const listaFormatada = formatarListaPaginada(paginacao)

    return `${ERRO_SLOTS}\n${listaFormatada}`
}

export function formatarConfirmacaoAgendamento(input: ConfirmacaoAgendamentoInput): string {
    const linhas: string[] = [
        "Agendamento realizado",
        `Protocolo: ${input.protocol}`,
        `Data e hora: ${input.quando}`,
    ]

    const endereco =
        input.unitAddress.trim() +
        (input.unitAddressComplement?.trim() ? ` (${input.unitAddressComplement.trim()})` : "")
    linhas.push(`Endereço: ${endereco}`)

    if (input.groupDocuments.length > 0) {
        linhas.push("")
        const tituloGrupo = input.byRepresentative
            ? "A pessoa que comparecer em seu nome deve levar:"
            : "Leve ao atendimento:"
        linhas.push(tituloGrupo)
        for (const doc of input.groupDocuments) {
            linhas.push(`• ${doc}`)
        }
    }

    if (input.questionDocuments.length > 0) {
        linhas.push("")
        linhas.push("Documentos úteis para esta dúvida:")
        for (const doc of input.questionDocuments) {
            linhas.push(`• ${doc}`)
        }
    }

    linhas.push("")
    const horasTexto = input.reminderHours === 1 ? "1 hora" : `${input.reminderHours} horas`
    const avisoTexto = input.reminderEnabled
        ? `Você receberá neste número avisos sobre este agendamento, como um lembrete ${horasTexto} antes do atendimento e o aviso em caso de cancelamento.`
        : "Você receberá neste número avisos sobre este agendamento, como o aviso em caso de cancelamento."
    linhas.push(avisoTexto)

    linhas.push("")
    linhas.push("Se precisar remarcar ou cancelar, responda a esta mensagem.")

    return linhas.join("\n")
}

export function formatarRespostaFinal(resposta: RespostaFinalOutput): string {
    const linhas = [
        `Categoria: ${resposta.categoria}`,
        `Pergunta: ${resposta.pergunta}`,
    ]

    if (resposta.base_legal) {
        linhas.push(`Base legal: ${resposta.base_legal}`)
    }

    linhas.push(`Resposta: ${resposta.resposta}`)

    if (resposta.documentos_necessarios.length > 0) {
        linhas.push(`Documentos necessários: ${resposta.documentos_necessarios.join(", ")}`)
    }

    let proximosPassos = resposta.proximos_passos
    if (!proximosPassos) {
        if (resposta.fora_de_escopo) {
            proximosPassos =
                "Como esta demanda não compete ao PROCON, dirija-se ao órgão indicado na orientação acima portando seus documentos e comprovantes para atendimento especializado."
        } else if (resposta.requer_presencial) {
            proximosPassos =
                "Como este caso requer análise documental aprofundada, organize os documentos necessários indicados e agende um atendimento presencial no PROCON Jacareí."
        } else if (resposta.documentos_necessarios.length > 0) {
            proximosPassos =
                "Separe os documentos necessários citados e faça contato formal com o fornecedor solicitando a solução amigável e anotando os protocolos. Caso não haja acordo, busque o PROCON."
        } else {
            proximosPassos =
                "Guarde os comprovantes da relação de consumo e informe ao fornecedor os seus direitos com base na legislação citada acima."
        }
    }

    linhas.push(`\nO que fazer agora:\n${proximosPassos}`)

    if (resposta.requer_presencial) {
        linhas.push(
            "\nEsta situação pode exigir atendimento presencial no PROCON Jacareí para andamento formal.",
        )
    }

    return `${linhas.join("\n")}\n\n${AVISO_NAO_VINCULANTE}`
}

function limitarString(texto: string | undefined | null, max: number): string {
    if (!texto) return ""
    const trimmed = texto.trim()
    return Array.from(trimmed).slice(0, max).join("")
}

export function criarMensagensCategorias(
    categorias: Categoria[],
    pagina: number = 1,
): OutgoingMessage[] {
    if (categorias.length === 0) {
        return [{ type: "text", text: formatarListaCategorias(categorias, pagina) }]
    }

    const paginacao = paginarItens(categorias, pagina)
    const rows: ListRow[] = paginacao.itensPagina.map((c) => ({
        id: `cat_${c.id}`,
        title: limitarString(c.short_title || c.title, 24),
        description: c.description ? limitarString(c.description, 72) : undefined,
    }))

    if (paginacao.opcaoAnterior !== undefined && paginacao.opcaoProxima !== undefined) {
        rows.push({
            id: `page_${paginacao.paginaAtual - 1}`,
            title: "Voltar opções",
            description: "Ver categorias anteriores",
        })
        rows.push({
            id: `page_${paginacao.paginaAtual + 1}`,
            title: "Ver mais opções",
            description: "Exibir mais categorias",
        })
    } else if (paginacao.opcaoProxima !== undefined) {
        rows.push({
            id: `page_${paginacao.paginaAtual + 1}`,
            title: "Ver mais opções",
            description: "Exibir mais categorias",
        })
    } else if (paginacao.opcaoAnterior !== undefined) {
        rows.push({
            id: `page_${paginacao.paginaAtual - 1}`,
            title: "Voltar opções",
            description: "Ver categorias anteriores",
        })
    }

    return [
        { type: "text", text: SAUDACAO },
        {
            type: "list",
            text: "Selecione a categoria correspondente à sua dúvida:",
            buttonText: "Ver categorias",
            rows,
        },
    ]
}

export function criarMensagensPerguntas(
    perguntas: Pergunta[],
    pagina: number = 1,
): OutgoingMessage[] {
    if (perguntas.length === 0) {
        return [{ type: "text", text: formatarCategoriaSemPerguntas() }]
    }

    const paginacao = paginarItens(perguntas, pagina)
    const rows: ListRow[] = paginacao.itensPagina.map((p) => ({
        id: `q_${p.id}`,
        title: limitarString(p.short_title || p.question, 24),
        description: p.short_description ? limitarString(p.short_description, 72) : undefined,
    }))

    if (paginacao.opcaoAnterior !== undefined && paginacao.opcaoProxima !== undefined) {
        rows.push({
            id: `page_${paginacao.paginaAtual - 1}`,
            title: "Voltar opções",
            description: "Ver perguntas anteriores",
        })
        rows.push({
            id: `page_${paginacao.paginaAtual + 1}`,
            title: "Ver mais opções",
            description: "Exibir mais perguntas",
        })
    } else if (paginacao.opcaoProxima !== undefined) {
        rows.push({
            id: `page_${paginacao.paginaAtual + 1}`,
            title: "Ver mais opções",
            description: "Exibir mais perguntas",
        })
    } else if (paginacao.opcaoAnterior !== undefined) {
        rows.push({
            id: `page_${paginacao.paginaAtual - 1}`,
            title: "Voltar opções",
            description: "Ver perguntas anteriores",
        })
    }

    return [
        {
            type: "list",
            text: "Escolha uma das perguntas abaixo:",
            buttonText: "Ver perguntas",
            rows,
        },
    ]
}

export function criarBotoesResolvida(): ReplyButton[] {
    return [
        { id: "resolved_yes", title: "Sim" },
        { id: "resolved_no", title: "Não" },
    ]
}

export function criarBotoesOfertaAgendamento(): ReplyButton[] {
    return [
        { id: "schedule_yes", title: "Agendar presencial" },
        { id: "schedule_no", title: "Agora não" },
    ]
}

export function criarBotoesAttendee(): ReplyButton[] {
    return [
        { id: "attendee_self", title: "Eu mesmo" },
        { id: "attendee_rep", title: "Um representante" },
    ]
}

export function formatarTituloSlot(slot: AvailableSlot): string {
    if (slot.dateStr && slot.timeStr) {
        const parts = slot.dateStr.split("-")
        const m = parts[1] ?? ""
        const d = parts[2] ?? ""
        const [yNum, mNum, dNum] = parts.map(Number)
        const dt = new Date(Date.UTC(yNum!, mNum! - 1, dNum!, 12, 0, 0))
        const dow = dt.getUTCDay()
        const abrevs = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
        const sem = abrevs[dow] ?? ""
        return limitarString(`${sem}, ${d}/${m} às ${slot.timeStr}`, 24)
    }
    return limitarString(slot.formatted, 24)
}

export function criarMensagensSlots(
    slots: AvailableSlot[],
    pagina: number = 1,
): OutgoingMessage[] {
    if (slots.length === 0) {
        return [{ type: "text", text: MENSAGEM_SEM_HORARIOS }]
    }

    const paginacao = paginarItens(slots, pagina)
    const rows: ListRow[] = paginacao.itensPagina.map((s, index) => {
        let globalIndex = index + 1
        if (paginacao.paginaAtual > 1) {
            globalIndex = 9 + (paginacao.paginaAtual - 2) * 8 + (index + 1)
        }
        return {
            id: `slot_${globalIndex}`,
            title: formatarTituloSlot(s),
            description: limitarString(
                s.remainingSeats === 1 ? "1 vaga disponível" : `${s.remainingSeats} vagas disponíveis`,
                72,
            ),
        }
    })

    if (paginacao.opcaoAnterior !== undefined && paginacao.opcaoProxima !== undefined) {
        rows.push({
            id: `page_${paginacao.paginaAtual - 1}`,
            title: "Voltar opções",
            description: "Ver horários anteriores",
        })
        rows.push({
            id: `page_${paginacao.paginaAtual + 1}`,
            title: "Ver mais opções",
            description: "Exibir mais horários",
        })
    } else if (paginacao.opcaoProxima !== undefined) {
        rows.push({
            id: `page_${paginacao.paginaAtual + 1}`,
            title: "Ver mais opções",
            description: "Exibir mais horários",
        })
    } else if (paginacao.opcaoAnterior !== undefined) {
        rows.push({
            id: `page_${paginacao.paginaAtual - 1}`,
            title: "Voltar opções",
            description: "Ver horários anteriores",
        })
    }

    return [
        {
            type: "list",
            text: PROMPT_SLOTS,
            buttonText: "Ver horários",
            rows,
        },
    ]
}

