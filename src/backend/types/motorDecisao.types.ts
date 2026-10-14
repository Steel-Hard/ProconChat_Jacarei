export interface Categoria {
    id: number
    title: string
    short_title?: string
    description?: string
    active: boolean
}

export interface Pergunta {
    id: number
    category_id: number
    question: string
    short_title?: string
    short_description?: string | null
    legal_basis: string | null
    answer: string
    requires_in_person: boolean
    in_person_note?: string | null
    out_of_scope: boolean
    active: boolean
}

export interface DocumentoNecessario {
    id: number
    question_id: number
    description: string
}

export interface RespostaFinalOutput {
    categoria: string
    pergunta: string
    base_legal: string
    resposta: string
    documentos_necessarios: string[]
    requer_presencial: boolean
    fora_de_escopo: boolean
    proximos_passos?: string
}
