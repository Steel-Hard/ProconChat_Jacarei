import css from "@/styles/pages/underConstruction.module.css"

type UnderConstructionPageProps = {
    title: string
}

function UnderConstructionPage({ title }: UnderConstructionPageProps) {
    return (
        <>
            <title>{`${title} - ProconChat`}</title>
            <meta name="description" content={`Tela de ${title} em construção.`} />
            <main className={css.main}>
                <div>
                    <h1>{title}</h1>
                    <p>Em construção.</p>
                </div>
            </main>
        </>
    )
}

export default UnderConstructionPage
