import { useTranslation } from "react-i18next"
import InfoTooltip from "@/components/InfoTooltip"
import formatReportCount from "@/utils/reports/formatReportCount"
import css from "@/styles/components/reportSections.module.css"
import type ReportsSummary from "@/types/reports/ReportsSummary.types"

type Props = { categories: ReportsSummary["topCategories"] }

function ReportsCategories({ categories }: Props) {
    const { t } = useTranslation("reports")
    const max = Math.max(...categories.map((category) => category.conversationsCount), 1)

    return (
        <section className={css.card} aria-labelledby="categories-heading">
            <h2 className={css.cardTitle} id="categories-heading">
                {t("categories.heading")}
                <InfoTooltip
                    label={t("tooltips.categories.label")}
                    text={t("tooltips.categories.text")}
                />
            </h2>
            {categories.length ? (
                <ol className={css.rankList} aria-labelledby="categories-heading">
                    {categories.map((category) => (
                        <li key={category.categoryId} className={css.categoryItem}>
                            <div className={css.categoryLine}>
                                <span>{category.title}</span>
                                <b
                                    aria-label={t(
                                        category.conversationsCount === 1
                                            ? "count.conversationsOne"
                                            : "count.conversationsOther",
                                        {
                                            formatted: formatReportCount(
                                                category.conversationsCount
                                            )
                                        }
                                    )}
                                >
                                    {formatReportCount(category.conversationsCount)}
                                </b>
                            </div>
                            <div className={css.categoryTrack}>
                                <div
                                    className={css.categoryBar}
                                    data-testid="category-bar"
                                    style={{
                                        width: `${(category.conversationsCount / max) * 100}%`
                                    }}
                                />
                            </div>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className={css.empty}>{t("empty.categories")}</p>
            )}
        </section>
    )
}

export default ReportsCategories
