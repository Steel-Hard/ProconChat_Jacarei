import { Categoria, Pergunta, DocumentoNecessario } from "../types/motorDecisao.types"
import { IMotorDecisaoRepository } from "./motorDecisao.repository.interface"

// TODO(#12): revisar se este mock ainda é necessário depois que o banco for
// populado com conteúdo real — substituir os fixtures abaixo por dados reais
// do FAQ do PROCON caso os testes passem a rodar contra o schema seedado.
export class MockMotorDecisaoRepository implements IMotorDecisaoRepository {
    private categorias: Categoria[] = [
        { id: 1, title: "Direito de Arrependimento", active: true },
        { id: 2, title: "Garantia e Defeitos", active: true },
        { id: 3, title: "Categoria Inativa", active: false }
    ]

    private perguntas: Pergunta[] = [
        {
            id: 1,
            category_id: 1,
            question: "Posso desistir de uma compra feita pela internet?",
            legal_basis: "Art. 49 do CDC",
            answer: "Sim, em compras online você tem até 7 dias corridos após o recebimento para desistir.",
            requires_in_person: false,
            out_of_scope: false,
            active: true
        },
        {
            id: 2,
            category_id: 1,
            question: "Como denunciar um crime cibernético?",
            legal_basis: null,
            answer: "",
            requires_in_person: false,
            out_of_scope: true,
            active: true
        },
        {
            id: 3,
            category_id: 2,
            question: "Comprei uma geladeira e ela veio com defeito, o que fazer?",
            legal_basis: "Art. 18 do CDC",
            answer: "Procure a assistência técnica autorizada. Se não resolverem em 30 dias, você pode exigir a troca.",
            requires_in_person: true,
            out_of_scope: false,
            active: true
        },
        {
            id: 4,
            category_id: 1,
            question: "Pergunta inativa?",
            legal_basis: null,
            answer: "N/A",
            requires_in_person: false,
            out_of_scope: false,
            active: false
        }
    ]

    private documentos: DocumentoNecessario[] = [
        { id: 1, question_id: 1, description: "Nota fiscal" },
        { id: 2, question_id: 1, description: "Comprovante de pagamento" },
        { id: 3, question_id: 3, description: "Nota fiscal" },
        { id: 4, question_id: 3, description: "Ordem de serviço da assistência" }
    ]

    async getCategoriasAtivas(): Promise<Categoria[]> {
        return this.categorias.filter((c) => c.active)
    }

    async getPerguntasAtivasPorCategoria(categoriaId: number): Promise<Pergunta[]> {
        return this.perguntas.filter((p) => p.category_id === categoriaId && p.active)
    }

    async getPerguntaById(perguntaId: number): Promise<Pergunta | null> {
        return this.perguntas.find((p) => p.id === perguntaId) || null
    }

    async getCategoriaById(categoriaId: number): Promise<Categoria | null> {
        return this.categorias.find((c) => c.id === categoriaId) || null
    }

    async getDocumentosPorPergunta(perguntaId: number): Promise<DocumentoNecessario[]> {
        return this.documentos.filter((d) => d.question_id === perguntaId)
    }
}
