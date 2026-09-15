import { FaqCategorySeed } from "./types"

const outrosProcedimentosGerais: FaqCategorySeed = {
    title: "Outros/Procedimentos Gerais",
    description: "Procedimentos de atendimento do Procon e demais dúvidas não cobertas pelas outras categorias.",
    questions: [
        {
            question: "Comprei um produto através de uma loja em uma plataforma online e houve um problema. Devo entrar em contato com a plataforma também?",
            legalBasis: "Art. 14 do CDC.",
            answer: "Sim. O consumidor deve entrar em contato tanto com a loja vendedora quanto com a plataforma online, já que o CDC impõe responsabilidade objetiva ao fornecedor de produtos ou serviços — o que inclui a loja e, em muitos casos, a plataforma que intermedia a venda, especialmente se ela facilita ou garante a transação.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Fiz uma reclamação pelo Procon online, mas não consegui resolver meu problema. Posso abrir uma reclamação presencial no posto de atendimento agora?",
            legalBasis: null,
            answer: "Não, pois não é possível abrir reclamação em duplicidade sobre o mesmo assunto.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Posso realizar a portabilidade do meu benefício a qualquer momento?",
            legalBasis: null,
            answer: "Sim, a portabilidade deve ser solicitada apenas pelo titular da conta bancária. Porém, se existir algum empréstimo pessoal ou dívida com o banco prevista em contrato, a portabilidade pode não ser concluída.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Qual é o prazo para resposta caso eu faça uma reclamação no Procon?",
            legalBasis: null,
            answer: "Após a abertura da CIP (reclamação), o fornecedor tem prazo de até 10 dias corridos para apresentar sua resposta no sistema. Caso não haja retorno da parte reclamada ou o problema não seja resolvido, será agendada uma audiência conciliatória.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Quais documentos são necessários para abrir uma reclamação no Procon?",
            legalBasis: null,
            answer: "Cada caso exige uma análise própria. Os documentos sempre essenciais são: CNPJ da matriz do fornecedor, comprovantes do problema e documento pessoal do consumidor. Pode ser necessária a solicitação de outros documentos, por isso é essencial o comparecimento do consumidor à sede do Procon para uma análise detalhada do caso.",
            requiresInPerson: true,
            requiredDocuments: [
                "CNPJ da matriz do fornecedor",
                "Comprovantes do problema",
                "Documento pessoal do consumidor (RG com CPF)",
            ],
        },
        {
            question: "Comprei um produto e fui informado(a) que receberia a nota fiscal em até 7 dias, mas o envio não foi feito, mesmo após contato com a loja. Que medidas posso tomar?",
            legalBasis: "Art. 6º, III do CDC.",
            answer: "O recebimento da nota fiscal é um direito do consumidor, ligado ao direito à informação garantido pelo art. 6º, III do CDC. Nessa situação, o Procon pode solicitar esclarecimento e o envio da documentação junto ao fornecedor.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "O Procon atende casos de direito imobiliário?",
            legalBasis: "Lei nº 8.245/1991 (Lei do Inquilinato).",
            answer: "Não. Casos que envolvam direito imobiliário são regidos pela Lei nº 8.245/1991 (Lei do Inquilinato). Nesses casos, o Procon não pode intervir ou orientar o consumidor, que deve ser orientado pela legislação específica.",
            requiresInPerson: false,
            outOfScope: true,
            requiredDocuments: [],
        },
    ],
}

export default outrosProcedimentosGerais
