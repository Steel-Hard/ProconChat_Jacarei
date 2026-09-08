import { FaqCategorySeed } from "./types"

const contrato: FaqCategorySeed = {
    title: "Contrato",
    description: "Dúvidas sobre acesso, cancelamento e cláusulas de contratos com fornecedores.",
    questions: [
        {
            question: "Não querem entregar meu contrato. O que posso fazer?",
            legalBasis: "Art. 6º, III e art. 46 do CDC.",
            answer: "O CDC garante o direito à informação clara e determina que o consumidor deve ter acesso prévio ao conteúdo do contrato. O fornecedor é obrigado a fornecer o documento, podendo a negativa gerar medidas administrativas ou judiciais. O consumidor tem direito de abrir uma reclamação no Procon requerendo a documentação. Os casos possuem variações, sendo necessário o comparecimento presencial ao Procon para obter uma consulta.",
            requiresInPerson: true,
            requiredDocuments: [
                "RG com CPF",
                "Números de protocolo",
                "Mensagens e e-mails requerendo o envio do contrato",
                "CNPJ da matriz do fornecedor",
            ],
        },
        {
            question: "Tenho um plano de telefone, quero cancelar e não estou conseguindo. O que fazer?",
            legalBasis: "Art. 6º, III; art. 39, V; art. 51 do CDC.",
            answer: "O consumidor tem direito de abrir uma reclamação no Procon, requerendo o cancelamento imediato do serviço, sem entraves indevidos, podendo exigir a suspensão das cobranças e buscar medidas administrativas ou judiciais caso a empresa persista na recusa. Os casos possuem variações — a empresa pode cobrar multa por quebra de contrato ou fidelidade —, sendo necessário o comparecimento presencial ao Procon para obter uma consulta.",
            requiresInPerson: true,
            requiredDocuments: [
                "RG com CPF",
                "Contrato",
                "Comprovantes de pagamento",
                "Mensagens e e-mails, caso existam",
                "Número de protocolo requerendo o cancelamento",
                "CNPJ da matriz do fornecedor",
            ],
        },
        {
            question: "Fui cancelar o contrato e foi cobrada uma multa. Isso pode?",
            legalBasis: null,
            answer: "Sim, é possível cancelar um contrato assinado sem pagar multa, mas apenas em casos específicos: direito de arrependimento (até 7 dias para compras fora do estabelecimento comercial), descumprimento de cláusulas pela empresa (falha no serviço) ou multa considerada abusiva (em geral, superior a 10% do valor restante).",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Um contrato pode ter cláusula de fidelidade?",
            legalBasis: "Art. 57 da Resolução nº 632/2014 da Anatel.",
            answer: "Sim, um contrato pode ter cláusula de fidelidade (ou permanência), comum em serviços de telecomunicações, academias e assinaturas — ela obriga o consumidor a manter o serviço por um tempo mínimo (máximo de 12 meses para pessoas físicas). A multa por cancelamento antecipado deve ser proporcional ao tempo restante e ao benefício recebido, sendo ilegal se a rescisão ocorrer por falha da operadora.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
    ],
}

export default contrato
