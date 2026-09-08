import { FaqCategorySeed } from "./types"

const cumprimentoDeOfertaPreco: FaqCategorySeed = {
    title: "Cumprimento de Oferta/Preço",
    description: "Descumprimento de prazos, preços anunciados e ofertas por parte do fornecedor.",
    questions: [
        {
            question: "O prazo de entrega não foi respeitado. O que posso fazer?",
            legalBasis: "Art. 35 do CDC.",
            answer: "O consumidor pode, a seu critério: exigir o cumprimento forçado da obrigação, nos termos da oferta, apresentação ou publicidade; aceitar outro produto ou prestação de serviço equivalente; ou rescindir o contrato, com direito à restituição da quantia eventualmente antecipada, monetariamente atualizada.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "O fornecedor é obrigado a cumprir o preço anunciado?",
            legalBasis: "Art. 30 do CDC.",
            answer: "Sim. O que é anunciado obriga o fornecedor — a oferta faz parte do contrato. Toda informação ou publicidade suficientemente precisa, veiculada por qualquer meio, obriga quem a veicular e integra o contrato que vier a ser celebrado.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Se o produto está com um preço na prateleira e outro no caixa, qual vale?",
            legalBasis: "Art. 30 do CDC.",
            answer: "Vale o menor preço. O consumidor tem direito à informação clara e correta; havendo divergência, aplica-se o valor mais vantajoso ao consumidor.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Se a loja não quiser vender pelo preço anunciado, o que o consumidor pode fazer?",
            legalBasis: "Art. 35 do CDC.",
            answer: "O consumidor pode escolher, alternativamente: exigir o cumprimento da oferta; aceitar outro produto ou serviço equivalente; ou cancelar e receber o dinheiro de volta, com direito a perdas e danos.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "A loja pode alegar 'erro do sistema' para não cumprir o preço anunciado?",
            legalBasis: "Art. 30 do CDC.",
            answer: "Em regra, não — o risco do negócio é do fornecedor, que é responsável pelas informações que divulga. A exceção reconhecida pela jurisprudência é o erro grosseiro e evidente: se o preço for claramente irreal, desproporcional e facilmente perceptível como erro, pode-se afastar a obrigatoriedade de cumprimento.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Se não houver informação de 'estoque limitado', a loja pode negar a venda dizendo que o produto acabou?",
            legalBasis: "Art. 39, II do CDC.",
            answer: "Não. A limitação de estoque deve ser informada de forma clara. É vedado ao fornecedor recusar atendimento às demandas dos consumidores na exata medida de suas disponibilidades de estoque, conforme os usos e costumes.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
    ],
}

export default cumprimentoDeOfertaPreco
