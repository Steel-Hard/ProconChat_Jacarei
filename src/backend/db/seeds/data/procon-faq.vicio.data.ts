import { FaqCategorySeed } from "./types"

const vicioDefeito: FaqCategorySeed = {
    title: "Vício/Defeito de Produto ou Serviço",
    description: "Distinção e prazos entre vícios aparentes, ocultos e fatos do produto ou serviço.",
    questions: [
        {
            question: "O que é vício aparente?",
            legalBasis: "Art. 26 do CDC (vícios aparentes ou de fácil constatação).",
            answer: "Vício aparente é a falha fácil de constatar no momento da compra ou do uso inicial do produto ou serviço — por exemplo, um risco na tela da TV ou um sapato descolado.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "O que é vício oculto?",
            legalBasis: "Art. 26, §3º do CDC.",
            answer: "Vício oculto é o defeito que não aparece de imediato e surge com o uso — por exemplo, um motor de carro que quebra com pouco tempo de uso.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Como se conta o prazo no caso de vício oculto?",
            legalBasis: "Art. 26, §3º do CDC.",
            answer: "O prazo para reclamar começa a contar a partir do momento em que o defeito é descoberto, e não da data da compra.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Quais são os prazos para reclamação por vício do produto ou serviço?",
            legalBasis: "Art. 26 do CDC.",
            answer: "30 dias para produtos ou serviços não duráveis (ex.: alimentos, serviços de estética); 90 dias para produtos ou serviços duráveis (ex.: eletrodomésticos, carros, celulares).",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Qual a diferença entre vício e defeito (fato) do produto ou serviço?",
            legalBasis: "Art. 12 e art. 18 do CDC (distinção entre vício e fato do produto/serviço).",
            answer: "Vício é o problema que se limita ao produto ou serviço (ex.: a TV não liga). Fato, ou defeito, é o problema que coloca em risco a saúde ou a segurança do consumidor, causando dano externo (ex.: o celular explode).",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Optei pela substituição de um produto com vício de fabricação, mas não há mais disponibilidade do mesmo modelo. Tenho direito a outro similar?",
            legalBasis: "Art. 18, §1º e §4º do CDC.",
            answer: "Sim. Não sendo o vício sanado no prazo máximo de 30 dias, o consumidor pode exigir, alternativamente e à sua escolha: a substituição do produto por outro da mesma espécie, em perfeitas condições de uso; a restituição imediata da quantia paga, monetariamente atualizada, sem prejuízo de eventuais perdas e danos; ou o abatimento proporcional do preço. Tendo optado pela substituição e não sendo ela possível, o consumidor pode receber outro produto de espécie, marca ou modelo diversos, mediante complementação ou restituição de eventual diferença de preço.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Comprei um veículo usado que, em menos de 90 dias, apresentou vício oculto. A loja fez o reparo, mas cerca de um mês depois o mesmo vício reapareceu. É possível solicitar a troca do veículo ou o cancelamento da compra?",
            legalBasis: "Art. 18 do CDC.",
            answer: "Não. Nesse caso é possível solicitar o cumprimento da garantia, conforme o art. 18 do CDC, mas não é possível requerer o cancelamento da compra ou a troca do veículo, considerando que se trata de um veículo semi-novo.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
        {
            question: "Comprei um veículo novo que, 40 dias após a compra, apresentou vício oculto. Quais medidas posso tomar?",
            legalBasis: "Art. 18 e art. 20 do CDC.",
            answer: "A primeira opção é o cumprimento da garantia, conforme os arts. 18 e 26 do CDC, solicitado junto ao fornecedor. Caso o vício não seja sanado, o consumidor pode optar pelo cancelamento da compra ou pela troca do produto, conforme o art. 20 do CDC.",
            requiresInPerson: false,
            requiredDocuments: [],
        },
    ],
}

export default vicioDefeito
