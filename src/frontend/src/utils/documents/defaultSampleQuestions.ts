import type SampleQuestion from "@/types/documents/SampleQuestion.types"

const DEFAULT_SAMPLE_QUESTIONS: SampleQuestion[] = [
    {
        id: "1",
        title: "Cobrança indevida no cartão de crédito",
        documents: [
            "RG com CPF",
            "Faturas com a descrição desde o início do desconto",
            "Comprovantes de pagamento",
            "CNPJ da matriz do fornecedor"
        ]
    },
    {
        id: "2",
        title: "Empréstimo já quitado com desconto em folha",
        documents: ["RG com CPF", "Descontos na folha de pagamento", "Comprovantes de pagamento"]
    },
    {
        id: "3",
        title: "Contrato não cumprido pelo fornecedor",
        documents: ["Cópia do contrato", "Comprovante de pagamento", "Protocolos de atendimento"]
    },
    {
        id: "4",
        title: "Direito de arrependimento de compra pela internet",
        documents: []
    }
]

export default DEFAULT_SAMPLE_QUESTIONS
