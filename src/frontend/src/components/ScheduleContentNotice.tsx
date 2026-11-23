import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import ROUTES from "@/routers/paths"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleContentNoticeProps = {
    showLink: boolean
}

function ScheduleContentNotice({ showLink }: ScheduleContentNoticeProps) {
    const { t } = useTranslation("schedule")

    return (
        <div className={css.notice}>
            <span className={css.noticeText}>{t("contentNotice.text")}</span>
            {showLink ? (
                <Link to={ROUTES.content} className={css.noticeLink}>
                    {t("contentNotice.link")}
                </Link>
            ) : null}
        </div>
    )
}

export default ScheduleContentNotice
