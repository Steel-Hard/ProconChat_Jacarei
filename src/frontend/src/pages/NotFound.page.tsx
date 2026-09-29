import { Link } from "react-router-dom"
import { ROUTES } from "@/routers/paths"
import css from "@/styles/pages/notFound.module.css"

function NotFoundPage() {
    return (
        <>
            <title>Página não encontrada.</title>
            <meta name="description" content="A página não existe ou você não possui acesso." />
            <main className={css.main}>
                <div>
                    <h1>404 - Not Found</h1>
                    <p>
                        <Link to={ROUTES.home}>Vá para a página inicial.</Link>
                    </p>
                </div>
            </main>
        </>
    )
}

export default NotFoundPage
