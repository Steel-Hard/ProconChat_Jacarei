import { FaqCategorySeed } from "./types"

const garantias: FaqCategorySeed = {
    title: "Garantias",
    description: "Tipos de garantia (legal, contratual, estendida), prazos e condições de acionamento.",
    questions: [
        {
            question: "Depois de receber um produto novo através da garantia, como fica a garantia desse produto novo?",
            legalBasis: "Art. 26 do CDC.",
            answer: "Se for um bem não durável, a garantia é de 30 dias; se for durável, 90 dias. Porém, o prazo não deve ser inferior ao do produto original — por exemplo, se o produto trocado tinha 9 meses restantes de garantia contratual, o novo produto terá essa mesma garantia restante de 9 meses.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Quais são os tipos de garantia existentes?",
            legalBasis: "Art. 26 e art. 50 do CDC.",
            answer: "Existem três tipos principais de garantia: Garantia Legal, Garantia Contratual e Garantia Estendida. O direito de reclamar pelos vícios aparentes ou de fácil constatação caduca em 30 dias (serviços e produtos não duráveis) ou 90 dias (serviços e produtos duráveis). A garantia contratual é complementar à legal e é conferida mediante termo escrito.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "O que é garantia legal?",
            legalBasis: "Art. 26 do CDC.",
            answer: "A garantia legal é aquela prevista no Código de Defesa do Consumidor e independe de contrato ou termo escrito. É de 30 dias para produtos ou serviços não duráveis (ex.: alimentos, serviços de lavanderia) e de 90 dias para produtos ou serviços duráveis (ex.: eletrodomésticos, móveis, eletrônicos).",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Quando começa a contar a garantia legal?",
            legalBasis: "Art. 26, §1º e §3º do CDC.",
            answer: "A contagem inicia a partir da entrega efetiva do produto ou da conclusão do serviço. No caso de defeito oculto (aquele que não é visível de imediato), o prazo começa a contar a partir do momento em que o problema é identificado.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "O que é garantia contratual?",
            legalBasis: "Art. 50 do CDC.",
            answer: "É a garantia oferecida pelo fabricante ou fornecedor de forma complementar à garantia legal, descrita em termo escrito, podendo ter prazo maior (ex.: 1 ou 2 anos). A garantia contratual não substitui a legal — ambas começam a contar da entrega do produto, mas o prazo da contratual soma-se ao da legal. O termo de garantia deve ser padronizado e esclarecer o conteúdo, a forma, o prazo, o lugar de exercício e os ônus do consumidor, sendo entregue pelo fornecedor no ato do fornecimento, junto com o manual de instrução, instalação e uso.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "O que é garantia estendida?",
            legalBasis: "Art. 39, I do CDC.",
            answer: "É um serviço adicional, normalmente pago, que prolonga o prazo da garantia contratual após o término dela. Funciona como um seguro e deve ter contrato específico detalhando cobertura, prazos e condições.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "O fornecedor pode negar atendimento na garantia?",
            legalBasis: "Art. 12, §3º, III do CDC.",
            answer: "Pode haver negativa quando o defeito foi causado por mau uso, o produto foi alterado por terceiros não autorizados, ou houve dano por acidente ou queda. Contudo, o fornecedor deve comprovar o mau uso.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "O que acontece se o problema não for resolvido em 30 dias?",
            legalBasis: "Art. 18, §1º do CDC.",
            answer: "Se o defeito não for solucionado em até 30 dias, o consumidor pode escolher entre: substituição do produto por outro novo, da mesma espécie e em perfeitas condições de uso; devolução do valor pago, monetariamente atualizado, sem prejuízo de eventuais perdas e danos; ou abatimento proporcional do preço.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Preciso da nota fiscal para acionar a garantia?",
            legalBasis: "Art. 6º, VIII do CDC.",
            answer: "A nota fiscal facilita a comprovação da compra, mas o consumidor pode utilizar outros meios de prova, como extrato bancário, fatura do cartão ou comprovante de pedido.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Produtos usados têm garantia?",
            legalBasis: "Art. 24 do CDC.",
            answer: "Sim. Produtos usados também possuem garantia legal de 90 dias, se duráveis, salvo se houver informação clara e específica sobre alguma limitação previamente informada ao consumidor.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Serviços também têm garantia?",
            legalBasis: "Art. 26 do CDC.",
            answer: "Sim. Serviços possuem garantia legal de 30 dias (não duráveis) ou 90 dias (duráveis).",
            requiresInPerson: false,
            requiredDocuments: [],
        },
    ],
}

export default garantias
