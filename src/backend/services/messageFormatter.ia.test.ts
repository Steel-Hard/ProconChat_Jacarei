import { describe, expect, it } from "vitest"
import { RespostaFinalOutput } from "../types/motorDecisao.types"
import {
    AVISO_NAO_VINCULANTE,
    conferirNumerosIa,
    criarBotoesOfertaAgendamento,
    criarBotoesResolvida,
    formatarRespostaFinal,
    mensagensRespostaOficial,
    montarMensagemIa,
    normalizarTextoIa,
} from "./messageFormatter.service"

const respostaComum: RespostaFinalOutput = {
    categoria: "Vício/Defeito de Produto ou Serviço",
    pergunta: "Comprei um produto com defeito, o que fazer?",
    base_legal: "Art. 18 do Código de Defesa do Consumidor (Lei 8.078/1990)",
    resposta: "Você tem até 30 dias para reclamar de produto não durável e 90 dias para produto durável.",
    documentos_necessarios: ["Nota fiscal", "Fotos do defeito"],
    requer_presencial: false,
    fora_de_escopo: false,
}

const respostaPresencial: RespostaFinalOutput = {
    ...respostaComum,
    pergunta: "O fornecedor se recusa a resolver, o que fazer?",
    requer_presencial: true,
}

describe("mensagensRespostaOficial", () => {
    it("devolve para a pergunta comum o texto oficial e a pergunta se a dúvida foi resolvida, como o fluxo envia hoje", () => {
        expect(mensagensRespostaOficial(respostaComum)).toEqual([
            { type: "text", text: formatarRespostaFinal(respostaComum) },
            { type: "buttons", text: "A dúvida foi resolvida?", buttons: criarBotoesResolvida() },
        ])
    })

    it("devolve para a pergunta presencial o texto oficial e a oferta de agendamento, como o fluxo envia hoje", () => {
        expect(mensagensRespostaOficial(respostaPresencial)).toEqual([
            { type: "text", text: formatarRespostaFinal(respostaPresencial) },
            {
                type: "buttons",
                text: "Deseja agendar um atendimento presencial no PROCON Jacareí?",
                buttons: criarBotoesOfertaAgendamento(),
            },
        ])
    })
})

const TEXTO_IA = "Você tem até 30 dias para reclamar de produto não durável.\n\nPara produto durável, o prazo é de 90 dias."

describe("montarMensagemIa", () => {
    it("monta a mensagem de botões da pergunta comum com o texto da IA, o bloco oficial, o aviso, a pergunta e o rótulo no rodapé", () => {
        expect(montarMensagemIa(TEXTO_IA, respostaComum)).toEqual({
            type: "buttons",
            text: [
                "Você tem até 30 dias para reclamar de produto não durável.",
                "",
                "Para produto durável, o prazo é de 90 dias.",
                "",
                "Base legal: Art. 18 do Código de Defesa do Consumidor (Lei 8.078/1990)",
                "Documentos necessários: Nota fiscal, Fotos do defeito",
                "",
                "O que fazer agora:",
                "Separe os documentos necessários citados e faça contato formal com o fornecedor solicitando a solução amigável e anotando os protocolos. Caso não haja acordo, busque o PROCON.",
                "",
                "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí.",
                "",
                "A dúvida foi resolvida?",
            ].join("\n"),
            buttons: [
                { id: "resolved_yes", title: "Sim" },
                { id: "resolved_no", title: "Não" },
            ],
            footer: "Gerado com auxílio de IA",
        })
    })

    it("termina a mensagem presencial com a linha de atendimento presencial, o aviso e a oferta de agendamento", () => {
        const final = [
            "",
            "Esta situação pode exigir atendimento presencial no PROCON Jacareí para andamento formal.",
            "",
            AVISO_NAO_VINCULANTE,
            "",
            "Deseja agendar um atendimento presencial no PROCON Jacareí?",
        ].join("\n")

        const mensagem = montarMensagemIa(TEXTO_IA, respostaPresencial) as { text: string }

        expect(mensagem.text.slice(-final.length)).toBe(final)
        expect(mensagem).toEqual({
            type: "buttons",
            text: mensagem.text,
            buttons: [
                { id: "schedule_yes", title: "Agendar presencial" },
                { id: "schedule_no", title: "Agora não" },
            ],
            footer: "Gerado com auxílio de IA",
        })
    })

    it("não escreve base legal nem documentos quando a pergunta não tem, sem linha em branco duplicada", () => {
        const resposta = { ...respostaComum, base_legal: "", documentos_necessarios: [] }

        const { text } = montarMensagemIa("Explicação da IA.", resposta) as { text: string }

        expect(text).toBe(
            [
                "Explicação da IA.",
                "",
                "O que fazer agora:",
                "Guarde os comprovantes da relação de consumo e informe ao fornecedor os seus direitos com base na legislação citada acima.",
                "",
                AVISO_NAO_VINCULANTE,
                "",
                "A dúvida foi resolvida?",
            ].join("\n"),
        )
        expect(text).not.toContain("Base legal:")
        expect(text).not.toContain("Documentos necessários:")
        expect(text).not.toContain("\n\n\n")
    })

    it("usa os próximos passos cadastrados em O que fazer agora quando a pergunta os tem", () => {
        const resposta = { ...respostaComum, proximos_passos: "Registre a reclamação no site consumidor.gov.br." }

        const { text } = montarMensagemIa("Explicação da IA.", resposta) as { text: string }

        expect(text).toContain("\n\nO que fazer agora:\nRegistre a reclamação no site consumidor.gov.br.\n\n")
    })
})

describe("normalizarTextoIa", () => {
    it.each([
        { regra: "troca \\r\\n por \\n", entrada: "Primeira linha\r\nSegunda linha", saida: "Primeira linha\nSegunda linha" },
        { regra: "tira espaços no fim de cada linha", entrada: "Primeira linha   \nSegunda linha\t", saida: "Primeira linha\nSegunda linha" },
        { regra: "remove # de título no início de linha", entrada: "## Seus direitos\nTexto", saida: "Seus direitos\nTexto" },
        { regra: "troca **negrito** por *negrito*", entrada: "Você tem **30 dias** para reclamar", saida: "Você tem *30 dias* para reclamar" },
        { regra: "troca o marcador - por •", entrada: "Itens:\n- nota fiscal", saida: "Itens:\n• nota fiscal" },
        { regra: "troca o marcador * por •", entrada: "Itens:\n* nota fiscal", saida: "Itens:\n• nota fiscal" },
        { regra: "troca o marcador • com recuo por •", entrada: "Itens:\n  • nota fiscal", saida: "Itens:\n• nota fiscal" },
        { regra: "troca o marcador 1. por •", entrada: "Itens:\n1. nota fiscal", saida: "Itens:\n• nota fiscal" },
        { regra: "troca o marcador 2) por •", entrada: "Itens:\n2) nota fiscal", saida: "Itens:\n• nota fiscal" },
        { regra: "remove a linha com o rótulo da IA", entrada: "Explicação.\nGerado com auxílio de IA", saida: "Explicação." },
        {
            regra: "remove a linha igual ao aviso não vinculante",
            entrada: `Explicação.\n${AVISO_NAO_VINCULANTE}\nMais texto.`,
            saida: "Explicação.\nMais texto.",
        },
        { regra: "reduz 4 quebras seguidas a 2", entrada: "Primeiro.\n\n\n\nSegundo.", saida: "Primeiro.\n\nSegundo." },
        { regra: "tira espaços e quebras das pontas", entrada: "\n  Explicação.  \n\n", saida: "Explicação." },
    ])("$regra", ({ entrada, saida }) => {
        expect(normalizarTextoIa(entrada)).toBe(saida)
    })

    it("separa um bloco único de 5 frases em parágrafos de 2, 2 e 1 frases", () => {
        const entrada = "Primeira frase. Segunda frase! Terceira frase? Quarta frase. Última frase."

        expect(normalizarTextoIa(entrada)).toBe(
            "Primeira frase. Segunda frase!\n\nTerceira frase? Quarta frase.\n\nÚltima frase.",
        )
    })

    it("mantém igual o bloco único com 2 frases", () => {
        expect(normalizarTextoIa("Primeira frase. Segunda frase.")).toBe("Primeira frase. Segunda frase.")
    })

    it("não quebra em Art. 18 nem em 8.078 e reconhece frase que começa com letra acentuada", () => {
        const entrada = "Conforme o Art. 18 do CDC, você pode reclamar. A Lei 8.078/1990 garante isso. É seu direito."

        expect(normalizarTextoIa(entrada)).toBe(
            "Conforme o Art. 18 do CDC, você pode reclamar. A Lei 8.078/1990 garante isso.\n\nÉ seu direito.",
        )
    })

    it("não reagrupa texto que já tem quebra de linha", () => {
        const entrada = "Primeira frase. Segunda frase. Terceira frase.\nQuarta frase."

        expect(normalizarTextoIa(entrada)).toBe(entrada)
    })
})

describe("conferirNumerosIa", () => {
    it.each([
        {
            caso: "ignora os marcadores de lista numerada que não estão na resposta",
            texto: "1. Você tem até 30 dias para produto não durável.\n2. Você tem 90 dias para produto durável.",
            esperado: true,
        },
        {
            caso: "aceita 8.078, de 1990 quando a base legal tem 8.078/1990",
            texto: "Pela Lei 8.078, de 1990, você tem 30 dias ou 90 dias.",
            esperado: true,
        },
        { caso: "recusa quando falta um número da resposta", texto: "Você tem até 30 dias para reclamar.", esperado: false },
        { caso: "recusa um número novo", texto: "Você tem 30 dias, 45 dias ou 90 dias.", esperado: false },
        { caso: "aceita exatamente os mesmos números", texto: "São 30 dias para não durável e 90 dias para durável.", esperado: true },
        { caso: "recusa número por extenso no lugar do algarismo", texto: "Você tem trinta dias ou 90 dias.", esperado: false },
        { caso: "aceita número que só aparece na base legal", texto: "Pelo Art. 18, você tem 30 dias ou 90 dias.", esperado: true },
    ])("$caso", ({ texto, esperado }) => {
        expect(conferirNumerosIa(texto, respostaComum)).toBe(esperado)
    })
})
