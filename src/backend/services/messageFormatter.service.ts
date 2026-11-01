import { OutgoingMessage, ListRow, ReplyButton } from "../types/message.types"
import { Categoria, Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import { AvailableSlot } from "../types/schedule.types"
import { CancellationReason } from "../types/appointment.types"
import { getLocalParts } from "../utils/date.utils"

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
    "Vamos iniciar o agendamento presencial. Quem irá comparecer ao atendimento?\n1. Eu mesmo\n2. Outra pessoa por mim"

export const ERRO_ATTENDEE =
    "Por favor, escolha uma das opções abaixo para indicar quem comparecerá ao atendimento:"

export const PROMPT_NOME =
    "Por favor, digite o nome completo do titular do atendimento:"

export const ERRO_NOME =
    "Por favor, digite o nome completo usando apenas letras (entre 2 e 150 caracteres):"

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

export const MENSAGEM_RASCUNHO_INCOMPLETO =
    "Houve uma inconsistência nos dados do agendamento. Vamos recomeçar:"

export const PROMPT_SLOTS =
    "Escolha um dos horários disponíveis para o atendimento presencial:"

export const ERRO_SLOTS =
    "Por favor, escolha um dos horários disponíveis na lista abaixo:"

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
    titulo?: string
}

export const MENSAGEM_ATENDIMENTO_PAUSADO =
    "O atendimento automático do PROCON Jacareí está temporariamente indisponível. Tente novamente mais tarde."

export const CORPO_AVISO_CANCELAMENTO =
    "Olá, {{1}}. Seu agendamento {{2}} no PROCON Jacareí, marcado para {{3}} às {{4}}, foi cancelado. Motivo: {{5}}. Para agendar novamente, envie uma mensagem para este número."

export const MODELO_AVISO_CANCELAMENTO = { name: "aviso_cancelamento", languageCode: "pt_BR" } as const

export const MODELO_LEMBRETE_ATENDIMENTO = { name: "lembrete_atendimento", languageCode: "pt_BR" } as const

export const FRASES_MOTIVO_CANCELAMENTO: Record<CancellationReason, string> = {
    UNIT_CLOSED: "a unidade estará fechada nesta data",
    CITIZEN_REQUEST: "cancelamento solicitado por você",
    DUPLICATE: "foi identificado outro agendamento em seu nome",
    OTHER: "não será possível realizar o atendimento neste horário",
}

export interface AvisoCancelamentoInput {
    name: string
    protocol: string
    appointmentDatetime: Date
    reason: CancellationReason
}

export function parametrosAvisoCancelamento(input: AvisoCancelamentoInput): string[] {
    const primeiroNome = input.name.trim().split(/\s+/)[0] ?? ""
    const { dateStr, timeStr } = getLocalParts(input.appointmentDatetime)
    const [, mes, dia] = dateStr.split("-")
    return [primeiroNome, input.protocol, `${dia}/${mes}`, timeStr, FRASES_MOTIVO_CANCELAMENTO[input.reason]]
}

export function formatarQuando(data: Date): string {
    const { dateStr, timeStr } = getLocalParts(data)
    const [, mes, dia] = dateStr.split("-")
    return `${dia}/${mes} às ${timeStr}`
}

export function renderizarModelo(corpo: string, parametros: string[]): string {
    return corpo.replace(/\{\{(\d+)\}\}/g, (marcador, posicao: string) => parametros[Number(posicao) - 1] ?? marcador)
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

function formatarListaPaginada(
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

function formatarSlotsComCabecalho(
    slots: AvailableSlot[],
    pagina: number,
    cabecalho: string,
): string {
    if (slots.length === 0) {
        return MENSAGEM_SEM_HORARIOS
    }

    const formatados = slots.map((s) => s.formatted)
    const paginacao = paginarItens(formatados, pagina)
    const listaFormatada = formatarListaPaginada(paginacao)

    return `${cabecalho}\n${listaFormatada}`
}

export function formatarListaSlots(
    slots: AvailableSlot[],
    pagina: number = 1,
): string {
    return formatarSlotsComCabecalho(slots, pagina, PROMPT_SLOTS)
}

export function formatarErroSlot(
    slots: AvailableSlot[],
    pagina: number = 1,
): string {
    return formatarSlotsComCabecalho(slots, pagina, ERRO_SLOTS)
}

export function formatarConfirmacaoAgendamento(input: ConfirmacaoAgendamentoInput): string {
    const linhas: string[] = [
        input.titulo ?? "Agendamento realizado",
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

function linhasDeNavegacao<T>(
    paginacao: PaginatedResult<T>,
    descricaoAnteriores: string,
    descricaoMais: string,
): ListRow[] {
    const linhas: ListRow[] = []

    if (paginacao.opcaoAnterior !== undefined) {
        linhas.push({
            id: `page_${paginacao.paginaAtual - 1}`,
            title: "Voltar opções",
            description: descricaoAnteriores,
        })
    }

    if (paginacao.opcaoProxima !== undefined) {
        linhas.push({
            id: `page_${paginacao.paginaAtual + 1}`,
            title: "Ver mais opções",
            description: descricaoMais,
        })
    }

    return linhas
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

    rows.push(...linhasDeNavegacao(paginacao, "Ver categorias anteriores", "Exibir mais categorias"))

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

    rows.push(...linhasDeNavegacao(paginacao, "Ver perguntas anteriores", "Exibir mais perguntas"))

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
        { id: "attendee_rep", title: "Outra pessoa por mim" },
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
    const rows: ListRow[] = paginacao.itensPagina.map((s) => ({
        id: `slot_${s.datetime.toISOString()}`,
        title: formatarTituloSlot(s),
        description: limitarString(
            s.remainingSeats === 1 ? "1 vaga disponível" : `${s.remainingSeats} vagas disponíveis`,
            72,
        ),
    }))

    rows.push(...linhasDeNavegacao(paginacao, "Ver horários anteriores", "Exibir mais horários"))

    return [
        {
            type: "list",
            text: PROMPT_SLOTS,
            buttonText: "Ver horários",
            rows,
        },
    ]
}

export const RODAPE_RETORNO = "Orientação informativa · Privacidade (LGPD) protegida"

export const ERRO_MENU_RETORNO =
    "Não entendi. Por favor, escolha uma das opções:\n1. Remarcar\n2. Cancelar\n3. Tenho outra dúvida"

export const ERRO_CONFIRMA_CANCELAMENTO =
    "Não entendi. Por favor, confirme se deseja cancelar o atendimento:\n1. Sim, cancelar\n2. Não, manter"

export const AGENDAMENTO_NAO_ALTERAVEL =
    "Este agendamento não pode mais ser alterado pelo chatbot. Se precisar de orientação, escolha uma das opções abaixo."

export const ERRO_FALHA_ALTERACAO =
    "Não foi possível concluir a alteração no momento devido a uma instabilidade. Seu agendamento não foi alterado. Por favor, tente novamente mais tarde."

export function TEXTO_BOTOES_RETORNO(quando: string): string {
    return `Você tem atendimento marcado em ${quando}.`
}

export function MENU_RETORNO(quando: string): string {
    return `${TEXTO_BOTOES_RETORNO(quando)}\n1. Remarcar\n2. Cancelar\n3. Tenho outra dúvida`
}

export function CONFIRMA_CANCELAMENTO(quando: string): string {
    return `Deseja mesmo cancelar o atendimento marcado em ${quando}? O cancelamento não pode ser desfeito.\n1. Sim, cancelar\n2. Não, manter`
}

export function RESPOSTA_CANCELADO(protocolo: string): string {
    return `Seu agendamento ${protocolo} foi cancelado e o horário foi liberado. Para agendar novamente, envie uma mensagem para este número.`
}

export function SEM_HORARIOS_REMARCACAO(quando: string): string {
    return `No momento não há outros horários disponíveis para remarcar. Seu atendimento continua marcado em ${quando}.`
}

export function criarBotoesRetorno(): ReplyButton[] {
    return [
        { id: "return_reschedule", title: "Remarcar" },
        { id: "return_cancel", title: "Cancelar" },
        { id: "return_other", title: "Tenho outra dúvida" },
    ]
}

export function criarBotoesConfirmaCancelamento(): ReplyButton[] {
    return [
        { id: "cancel_yes", title: "Sim, cancelar" },
        { id: "cancel_no", title: "Não, manter" },
    ]
}
