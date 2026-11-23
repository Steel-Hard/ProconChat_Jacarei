import { useTranslation } from "react-i18next"
import ScheduleContentNotice from "@/components/ScheduleContentNotice"
import ScheduleTextField from "@/components/ScheduleTextField"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleUnitFieldsProps = {
    address: string
    complement: string
    addressMessages: string[]
    complementMessages: string[]
    showContentLink: boolean
    onChangeAddress: (value: string) => void
    onChangeComplement: (value: string) => void
}

function ScheduleUnitFields({
    address,
    complement,
    addressMessages,
    complementMessages,
    showContentLink,
    onChangeAddress,
    onChangeComplement
}: ScheduleUnitFieldsProps) {
    const { t } = useTranslation("schedule")

    return (
        <section className={css.section}>
            <div>
                <h2 className={css.sectionTitle}>{t("unit.title")}</h2>
                <p className={css.sectionDescription}>{t("unit.description")}</p>
            </div>
            <ScheduleContentNotice showLink={showContentLink} />
            <ScheduleTextField
                label={t("unit.address")}
                placeholder={t("unit.addressPlaceholder")}
                value={address}
                messages={addressMessages}
                onChange={onChangeAddress}
            />
            <ScheduleTextField
                label={t("unit.complement")}
                placeholder={t("unit.complementPlaceholder")}
                value={complement}
                messages={complementMessages}
                onChange={onChangeComplement}
            />
        </section>
    )
}

export default ScheduleUnitFields
