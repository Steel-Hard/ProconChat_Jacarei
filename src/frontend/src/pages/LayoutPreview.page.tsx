import ConfirmDialog from "@/components/ConfirmDialog"
import EmptyState from "@/components/EmptyState"
import InfoTooltip from "@/components/InfoTooltip"
import LastChangeNote from "@/components/LastChangeNote"
import StatusBadge from "@/components/StatusBadge"
import UnsavedChangesBar from "@/components/UnsavedChangesBar"
import APPOINTMENT_STATUS_ORDER from "@/status/appointmentStatusOrder"
import CONVERSATION_OUTCOME_ORDER from "@/status/conversationOutcomeOrder"
import useLayoutPreview from "@/pages/hooks/useLayoutPreview"
import css from "@/styles/pages/layoutPreview.module.css"

function LayoutPreviewPage() {
    const preview = useLayoutPreview()
    const danger = preview.dialogTone === "danger"

    return (
        <>
            <title>Prévia do layout - ProconChat</title>
            <div className={css.page}>
                <div className={css.header}>
                    <div>
                        <h1 className={css.title}>Prévia do layout</h1>
                        <p className={css.subtitle}>
                            Exemplos dos componentes compartilhados do painel.
                        </p>
                        <LastChangeNote change={preview.lastChange} />
                    </div>
                    <UnsavedChangesBar
                        changes={preview.changes}
                        saving={preview.saving}
                        onDiscard={preview.discardChanges}
                        onSave={preview.saveChanges}
                    />
                </div>

                <section className={css.card} aria-labelledby="preview-status">
                    <h2 id="preview-status" className={css.cardTitle}>
                        Status de agendamento
                    </h2>
                    <div className={css.row}>
                        {APPOINTMENT_STATUS_ORDER.map((status) => (
                            <StatusBadge key={status} kind="appointment" status={status} />
                        ))}
                    </div>
                    <h2 className={css.cardTitle}>Desfecho de conversa</h2>
                    <div className={css.row}>
                        {CONVERSATION_OUTCOME_ORDER.map((status) => (
                            <StatusBadge key={status} kind="outcome" status={status} />
                        ))}
                    </div>
                </section>

                <section className={css.card} aria-labelledby="preview-actions">
                    <h2 id="preview-actions" className={css.cardTitle}>
                        Ações
                    </h2>
                    <div className={css.row}>
                        <span className={css.inline}>
                            Mensagens recebidas
                            <InfoTooltip text="Quantidade de mensagens recebidas pelo chatbot nas últimas 24 horas." />
                        </span>
                        <button
                            type="button"
                            className={css.button}
                            onClick={() => preview.openDialog("primary")}
                        >
                            Abrir confirmação
                        </button>
                        <button
                            type="button"
                            className={css.button}
                            onClick={() => preview.openDialog("danger")}
                        >
                            Abrir confirmação de perigo
                        </button>
                        <button
                            type="button"
                            className={css.button}
                            onClick={() =>
                                preview.showToast("Agendamento A3F9C21B assumido por você.")
                            }
                        >
                            Mostrar toast
                        </button>
                        <button type="button" className={css.button} onClick={preview.resetChanges}>
                            Recriar alterações
                        </button>
                    </div>
                </section>

                <section className={css.card} aria-label="Estado vazio">
                    <EmptyState
                        title="Nenhum agendamento pendente"
                        description="Todos os agendamentos criados pelo chatbot já têm responsável."
                        action={{
                            label: "Atualizar lista",
                            onClick: () => preview.showToast("Lista atualizada.")
                        }}
                    />
                </section>
            </div>

            <ConfirmDialog
                open={preview.dialogTone !== null}
                tone={danger ? "danger" : "primary"}
                title={danger ? "Cancelar o agendamento A3F9C21B?" : "Assumir o agendamento?"}
                description={
                    danger
                        ? "O horário volta a ficar disponível no chatbot e o cidadão é avisado pelo WhatsApp."
                        : "Você passa a ser o responsável por este agendamento."
                }
                confirmLabel={danger ? "Cancelar e avisar o cidadão" : "Assumir"}
                onConfirm={preview.confirmDialog}
                onCancel={preview.closeDialog}
            />
        </>
    )
}

export default LayoutPreviewPage
