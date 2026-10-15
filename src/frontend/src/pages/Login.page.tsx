import { useTranslation } from "react-i18next"
import { Navigate } from "react-router-dom"
import useLogin from "@/pages/hooks/useLogin"
import css from "@/styles/pages/login.module.css"

function LoginPage() {
    const { t } = useTranslation("login")
    const login = useLogin()

    if (login.authenticated) {
        return <Navigate to={login.destination} replace />
    }

    return (
        <>
            <title>{t("meta.title")}</title>
            <main className={css.main}>
                <div className={css.container}>
                    <div className={css.brand}>
                        <span className={css.logo} aria-hidden="true">
                            {t("logo")}
                        </span>
                        <div>
                            <p className={css.brandName}>{t("brand")}</p>
                            <p className={css.subtitle}>{t("subtitle")}</p>
                        </div>
                    </div>
                    <form className={css.card} noValidate onSubmit={login.submit}>
                        <h1 className={css.heading}>{t("heading")}</h1>
                        <label className={css.field}>
                            {t("email")}
                            <input
                                className={css.input}
                                type="email"
                                name="email"
                                autoComplete="username"
                                placeholder={t("emailPlaceholder")}
                                value={login.email}
                                onChange={(event) => login.setEmail(event.target.value)}
                            />
                        </label>
                        <label className={css.field}>
                            {t("password")}
                            <input
                                className={css.input}
                                type="password"
                                name="password"
                                autoComplete="current-password"
                                value={login.password}
                                onChange={(event) => login.setPassword(event.target.value)}
                            />
                        </label>
                        {login.error ? (
                            <div role="alert" className={css.error}>
                                {login.error}
                            </div>
                        ) : null}
                        <button type="submit" className={css.submit} disabled={login.submitting}>
                            {login.submitting ? t("submitting") : t("submit")}
                        </button>
                    </form>
                    <p className={css.support}>{t("support")}</p>
                </div>
            </main>
        </>
    )
}

export default LoginPage
