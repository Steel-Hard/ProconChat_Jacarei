import { useTranslation } from "react-i18next"
import InfoTooltip from "@/components/InfoTooltip"
import formatReportCount from "@/utils/reports/formatReportCount"
import css from "@/styles/components/reportSections.module.css"
import type ReportsSummary from "@/types/reports/ReportsSummary.types"

type Props = { questions: ReportsSummary["topQuestions"] }

function ReportsQuestions({ questions }: Props) {
    const { t } = useTranslation("reports")

    return (
        <section className={css.card} aria-labelledby="questions-heading">
            <h2 className={css.cardTitle} id="questions-heading">
                {t("questions.heading")}
                <InfoTooltip
                    label={t("tooltips.questions.label")}
                    text={t("tooltips.questions.text")}
                />
            </h2>
            {questions.length ? (
                <ol className={css.questionList} aria-labelledby="questions-heading">
                    {questions.map((question, index) => (
                        <li key={question.questionId} className={css.questionItem}>
                            <span className={css.questionPosition}>{index + 1}</span>
                            <div className={css.questionText}>
                                <span>{question.question}</span>
                                <small>{question.categoryTitle}</small>
                            </div>
                            <b
                                aria-label={t(
                                    question.conversationsCount === 1
                                        ? "count.conversationsOne"
                                        : "count.conversationsOther",
                                    { formatted: formatReportCount(question.conversationsCount) }
                                )}
                            >
                                {formatReportCount(question.conversationsCount)}
                            </b>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className={css.empty}>{t("empty.questions")}</p>
            )}
        </section>
    )
}

export default ReportsQuestions
