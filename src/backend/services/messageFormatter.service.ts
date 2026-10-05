import { Categoria, Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"

export const SAUDACAO =
    "Olá! Sou o assistente virtual do PROCON Jacareí. As orientações abaixo têm caráter informativo e não substituem o atendimento formal. Para o atendimento, protegemos seus dados conforme a LGPD.\n\nEscolha uma das opções abaixo digitando o número correspondente:"

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

    linhas.push(
        "\nO que fazer agora:\nGuarde os documentos necessários e siga as orientações indicadas para buscar a resolução junto ao fornecedor.",
    )

    if (resposta.requer_presencial) {
        linhas.push(
            "\nEsta situação pode exigir atendimento presencial no PROCON Jacareí para andamento formal.",
        )
    }

    return `${linhas.join("\n")}\n\n${AVISO_NAO_VINCULANTE}`
}
