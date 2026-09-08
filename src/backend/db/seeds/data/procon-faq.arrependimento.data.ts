import { FaqCategorySeed } from "./types"

const direitoDeArrependimento: FaqCategorySeed = {
    title: "Direito de Arrependimento (7 dias)",
    description: "Direito de desistência em compras feitas fora do estabelecimento comercial.",
    questions: [
        {
            question: "O que é o direito de arrependimento de 7 dias?",
            legalBasis: "Art. 49 do CDC.",
            answer: "O consumidor pode desistir do contrato no prazo de 7 dias, a contar da assinatura ou do recebimento do produto/serviço, sempre que a contratação ocorrer fora do estabelecimento comercial (por exemplo, por telefone ou a domicílio). Se exercido o direito de arrependimento, os valores eventualmente pagos serão devolvidos de imediato, monetariamente atualizados.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "O direito de arrependimento de 7 dias vale para compra em loja física?",
            legalBasis: "Art. 49 do CDC.",
            answer: "Não. O direito de arrependimento se aplica a compras feitas fora do estabelecimento comercial. O consumidor não precisa justificar o motivo da desistência; basta informar dentro do prazo de 7 dias que se arrependeu da compra.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "No direito de arrependimento, quem paga o frete de devolução?",
            legalBasis: "Art. 49 do CDC.",
            answer: "A empresa. O consumidor não deve arcar com nenhum custo de frete ou postagem para a devolução — a empresa deve reembolsar o valor total pago, incluindo o frete de envio.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Abri a embalagem e usei o produto. Ainda posso devolver dentro do prazo de arrependimento?",
            legalBasis: "Art. 49 do CDC.",
            answer: "Sim, desde que com cautela. O consumidor tem o direito de testar o produto para saber se ele atende às expectativas, como faria em uma loja física. A embalagem original é recomendada, mas não obrigatória, e o produto deve ser devolvido sem danos causados por mau uso.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "As lojas têm obrigação de trocar produtos sem defeito?",
            legalBasis: "Art. 49 do CDC.",
            answer: "Não. Apesar de ser uma prática comum no mercado, não há regulamentação sobre a troca de produtos sem defeito, cabendo a cada fornecedor estabelecer suas próprias regras.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Comprei um item presencialmente e, em menos de 24h, voltei à loja para solicitar cancelamento/troca por questões pessoais, mas a loja recusou. Essa prática está correta?",
            legalBasis: "Direito de arrependimento previsto no art. 49 do CDC (aplicável apenas a compras fora do estabelecimento comercial).",
            answer: "Sim, está correto. O direito de arrependimento previsto no CDC vale apenas para compras feitas de forma online ou fora do estabelecimento comercial. Em compras presenciais, o consumidor pôde avaliar o produto antes de comprar, portanto o fornecedor não é obrigado a realizar a troca ou o cancelamento. Se o item for um presente, a troca fica a critério da loja.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
    ],
}

export default direitoDeArrependimento
