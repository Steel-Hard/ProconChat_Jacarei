import { Categoria, Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"

const SAUDACAO =
    "Olá! Sou o assistente virtual do PROCON Jacareí. Escolha uma das opções abaixo digitando o número correspondente:"

const ERRO_PREFIXO = "Não entendi. Digite o número de uma das opções abaixo:"

function formatarLista(itens: string[]): string {
    return itens.map((item, index) => `${index + 1}. ${item}`).join("\n")
}

export function formatarListaCategorias(categorias: Categoria[]): string {
    if (categorias.length === 0) {
        return "Olá! Sou o assistente virtual do PROCON Jacareí. Nosso catálogo de orientações está em atualização no momento. Por favor, tente novamente em instantes."
    }
    return `${SAUDACAO}\n${formatarLista(categorias.map((c) => c.title))}`
}

export function formatarErroCategoria(categorias: Categoria[]): string {
    if (categorias.length === 0) {
        return "Nosso catálogo de orientações está em atualização no momento. Por favor, tente novamente em instantes."
    }
    return `${ERRO_PREFIXO}\n${formatarLista(categorias.map((c) => c.title))}`
}

export function formatarListaPerguntas(perguntas: Pergunta[]): string {
    return `Escolha uma das perguntas abaixo digitando o número correspondente:\n${formatarLista(
        perguntas.map((p) => p.question),
    )}`
}

export function formatarErroPergunta(perguntas: Pergunta[]): string {
    return `${ERRO_PREFIXO}\n${formatarLista(perguntas.map((p) => p.question))}`
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

    if (resposta.requer_presencial) {
        linhas.push(
            "\nEsta situação pode exigir atendimento presencial no PROCON Jacareí para andamento formal.",
        )
    }

    return linhas.join("\n")
}
