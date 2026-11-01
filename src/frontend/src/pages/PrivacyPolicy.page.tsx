import { useTranslation } from "react-i18next"
import PrivacyPolicyValue from "@/components/PrivacyPolicyValue"
import usePrivacyPolicy from "@/pages/hooks/usePrivacyPolicy"
import css from "@/styles/pages/privacyPolicy.module.css"

function PrivacyPolicyPage() {
    const { t } = useTranslation("privacyPolicy")
    const { settings, failed } = usePrivacyPolicy()

    return (
        <>
            <title>{t("meta.title")}</title>
            <main className={css.main}>
                <article className={css.article}>
                    <p className={css.brand}>{t("brand")}</p>
                    <h1 className={css.heading}>{t("heading")}</h1>
                    <p className={css.paragraph}>{t("intro")}</p>
                    {failed ? (
                        <p role="alert" className={css.alert}>
                            {t("loadFailed")}
                        </p>
                    ) : null}
                    <section className={css.section}>
                        <h2 className={css.sectionTitle}>{t("controller.heading")}</h2>
                        {settings ? (
                            <>
                                <PrivacyPolicyValue
                                    missingText={t("notRegistered")}
                                    label={t("controller.controllerLabel")}
                                    value={settings.controllerName}
                                />
                                <PrivacyPolicyValue
                                    missingText={t("notRegistered")}
                                    label={t("controller.dpoLabel")}
                                    value={settings.dpoName}
                                />
                            </>
                        ) : null}
                    </section>
                    <section className={css.section}>
                        <h2 className={css.sectionTitle}>{t("collected.heading")}</h2>
                        <ul className={css.list}>
                            <li>{t("collected.phone")}</li>
                            <li>{t("collected.appointment")}</li>
                            <li>{t("collected.steps")}</li>
                        </ul>
                    </section>
                    <section className={css.section}>
                        <h2 className={css.sectionTitle}>{t("purpose.heading")}</h2>
                        <ul className={css.list}>
                            <li>{t("purpose.guidance")}</li>
                            <li>{t("purpose.notices")}</li>
                            <li>{t("purpose.reports")}</li>
                        </ul>
                    </section>
                    <section className={css.section}>
                        <h2 className={css.sectionTitle}>{t("notStored.heading")}</h2>
                        <ul className={css.list}>
                            <li>{t("notStored.freeText")}</li>
                            <li>{t("notStored.cpf")}</li>
                            <li>{t("notStored.phone")}</li>
                        </ul>
                    </section>
                    <section className={css.section}>
                        <h2 className={css.sectionTitle}>{t("whatsapp.heading")}</h2>
                        <p className={css.paragraph}>{t("whatsapp.meta")}</p>
                    </section>
                    <section className={css.section}>
                        <h2 className={css.sectionTitle}>{t("retention.heading")}</h2>
                        <p className={css.paragraph}>{t("retention.phone")}</p>
                        <p className={css.paragraph}>{t("retention.backups")}</p>
                        {settings ? (
                            <PrivacyPolicyValue
                                missingText={t("notRegistered")}
                                label={t("retention.otherLabel")}
                                value={settings.retentionText}
                            />
                        ) : null}
                    </section>
                    <section className={css.section}>
                        <h2 className={css.sectionTitle}>{t("rights.heading")}</h2>
                        <p className={css.paragraph}>{t("rights.text")}</p>
                        {settings ? (
                            <PrivacyPolicyValue
                                missingText={t("notRegistered")}
                                label={t("rights.emailLabel")}
                                value={settings.contactEmail}
                                email
                            />
                        ) : null}
                    </section>
                    <section className={css.section}>
                        <h2 className={css.sectionTitle}>{t("contact.heading")}</h2>
                        {settings ? (
                            <>
                                <PrivacyPolicyValue
                                    missingText={t("notRegistered")}
                                    label={t("contact.emailLabel")}
                                    value={settings.contactEmail}
                                    email
                                />
                                {settings.inPersonContact === null ? null : (
                                    <PrivacyPolicyValue
                                        missingText={t("notRegistered")}
                                        label={t("contact.inPersonLabel")}
                                        value={settings.inPersonContact}
                                    />
                                )}
                            </>
                        ) : null}
                    </section>
                </article>
            </main>
        </>
    )
}

export default PrivacyPolicyPage
