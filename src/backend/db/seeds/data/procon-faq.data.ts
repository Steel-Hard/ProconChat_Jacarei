import { FaqCategorySeed } from "./types"
import cobrancaDescontoIndevido from "./procon-faq.cobranca.data"
import contrato from "./procon-faq.contrato.data"
import direitoDeArrependimento from "./procon-faq.arrependimento.data"
import cumprimentoDeOfertaPreco from "./procon-faq.oferta.data"
import vicioDefeito from "./procon-faq.vicio.data"
import garantias from "./procon-faq.garantias.data"
import outrosProcedimentosGerais from "./procon-faq.outros.data"

const proconFaqSeed: FaqCategorySeed[] = [
    cobrancaDescontoIndevido,
    contrato,
    direitoDeArrependimento,
    cumprimentoDeOfertaPreco,
    vicioDefeito,
    garantias,
    outrosProcedimentosGerais,
]

export default proconFaqSeed
