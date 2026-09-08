import { FaqCategorySeed } from "./types"

const cobrancaDescontoIndevido: FaqCategorySeed = {
    title: "Cobrança/Desconto Indevido",
    description: "Cobranças e descontos não reconhecidos ou não contratados pelo consumidor.",
    questions: [
        {
            question: "Estão cobrando um seguro no meu cartão de crédito que eu não contratei. O que posso fazer?",
            legalBasis: "Art. 6º, III; art. 14, caput; art. 39, III; art. 42, parágrafo único, do CDC.",
            answer: "O consumidor tem direito de abrir uma reclamação no Procon, requerendo o cancelamento imediato da cobrança, a devolução em dobro dos valores cobrados indevidamente e o envio do contrato. Os casos possuem variações, sendo necessário o comparecimento presencial ao Procon para obter uma consulta.",
            requiresInPerson: true,
            requiredDocuments: [
                "RG com CPF",
                "Faturas com a descrição desde o início do desconto",
                "Comprovantes de pagamento",
                "Mensagens e e-mails, caso existam",
                "CNPJ da matriz do fornecedor",
            ],
        },
        {
            question: "Estão descontando um empréstimo já quitado na minha folha de pagamento. O que fazer?",
            legalBasis: "Art. 14 e art. 42 do CDC.",
            answer: "O consumidor tem direito de abrir uma reclamação no Procon, requerendo a devolução em dobro dos valores cobrados indevidamente e a interrupção imediata dos descontos. Os casos possuem variações, sendo necessário o comparecimento presencial ao Procon para obter uma consulta.",
            requiresInPerson: true,
            requiredDocuments: [
                "RG com CPF",
                "Descontos na folha de pagamento",
                "Comprovantes de pagamento",
                "Mensagens e e-mails, caso existam",
                "CNPJ da matriz do fornecedor",
            ],
        },
        {
            question: "Estão descontando do meu benefício um valor referente a um empréstimo que eu não contratei. O que fazer?",
            legalBasis: "Art. 4º, I; art. 14, caput; art. 39, III; art. 42, parágrafo único, do CDC.",
            answer: "O consumidor tem direito de abrir uma reclamação no Procon, requerendo o cancelamento imediato, a devolução em dobro dos valores cobrados indevidamente e o envio do contrato. Se o consumidor já tiver usado o dinheiro, o Procon só poderá requerer uma proposta de quitação — por isso é necessário comparecer presencialmente ao Procon para obter uma consulta.",
            requiresInPerson: true,
            requiredDocuments: [
                "RG com CPF",
                "Extrato consignado do INSS",
                "Extrato bancário com a data de inclusão",
                "Histórico de crédito",
                "Mensagens e e-mails, caso existam",
                "CNPJ da matriz do fornecedor",
            ],
        },
        {
            question: "Estão cobrando no meu benefício um valor referente a RMC/RCC que eu não reconheço. O que fazer?",
            legalBasis: "Art. 39, III; art. 42; art. 14 do CDC.",
            answer: "O consumidor tem direito de abrir uma reclamação no Procon, requerendo a devolução em dobro dos valores cobrados indevidamente e a interrupção imediata dos descontos, salvo engano justificável. Se o consumidor já tiver usado o dinheiro, o Procon só poderá requerer uma proposta de quitação — por isso é necessário comparecer presencialmente ao Procon para obter uma consulta.",
            requiresInPerson: true,
            requiredDocuments: [
                "RG com CPF",
                "Extrato consignado do INSS",
                "Extrato bancário com a data de inclusão",
                "Histórico de crédito",
                "Mensagens e e-mails, caso existam",
                "CNPJ da matriz do fornecedor",
            ],
        },
        {
            question: "A dívida prescreve após cinco anos?",
            legalBasis: "Instituto da prescrição (o FAQ original não cita um artigo de lei específico para este item).",
            answer: "Não. Dívidas com mais de cinco anos não podem mais ser cobradas judicialmente nem gerar negativação do nome do devedor, em razão do instituto da prescrição. Porém, a prescrição não extingue a dívida: ela continua existindo para a empresa credora, que ainda pode oferecer ao devedor a oportunidade de quitar as pendências.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
    ],
}

export default cobrancaDescontoIndevido
