import { useNavigate } from "react-router-dom"
import Button from "@/components/Button"
import { ROUTES } from "@/routers/paths"
import css from "@/styles/pages/home.module.css"

function HomePage() {
    const navigate = useNavigate()

    return (
        <>
            <title>Título da Página</title>
            <meta name="description" content="Minha descrição personalizada." />
            <main className={css.main}>
                <h1>Hello World!</h1>
                <Button label="Ver exemplos integrados" onClick={() => navigate(ROUTES.examples)} />
                <section className={css.showcase}>
                    <p className={css.label}>Rótulo de exemplo</p>
                    <p className={css.description}>
                        Este parágrafo de exemplo demonstra a tipografia de corpo e a largura de
                        leitura confortável dos tokens de design deste template, com um trecho em{" "}
                        <strong>destaque</strong>.
                    </p>
                    <p className={css.caption}>
                        Legenda de exemplo em texto secundário, para conteúdo complementar.
                    </p>
                    <div className={css.chips}>
                        <span className={`${css.chip} ${css.chipSuccess}`}>Sucesso</span>
                        <span className={`${css.chip} ${css.chipWarning}`}>Aviso</span>
                        <span className={`${css.chip} ${css.chipError}`}>Erro</span>
                    </div>
                </section>
            </main>
        </>
    )
}

export default HomePage
