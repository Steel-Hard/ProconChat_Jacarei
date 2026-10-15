import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { Outlet } from "react-router-dom"
import ChangePasswordDialog from "@/components/ChangePasswordDialog"
import Sidebar from "@/components/Sidebar"
import Topbar from "@/components/Topbar"
import usePanelShell from "@/hooks/usePanelShell"
import css from "@/styles/layouts/panel.module.css"

const SIDEBAR_CLASSES = {
    docked: css.sidebarDocked,
    drawer: css.drawer,
    drawerOpen: `${css.drawer} ${css.drawerOpen}`
}

function PanelShell() {
    const { t } = useTranslation()
    const {
        account,
        badges,
        docked,
        sidebarId,
        sidebarMode,
        drawerOpen,
        drawerVisible,
        drawerRef,
        menuButtonRef,
        passwordOpen,
        openDrawer,
        closeDrawer,
        dismissDrawer,
        openPassword,
        closePassword,
        handleLogout
    } = usePanelShell()

    return (
        <>
            <div className={css.shell}>
                <div
                    ref={drawerRef}
                    className={SIDEBAR_CLASSES[sidebarMode]}
                    hidden={!docked && !drawerOpen}
                >
                    <Sidebar
                        id={sidebarId}
                        account={account}
                        badges={badges}
                        onNavigate={closeDrawer}
                    />
                </div>
                {drawerVisible ? (
                    <div role="presentation" className={css.overlay} onClick={dismissDrawer} />
                ) : null}
                <div className={css.content} inert={drawerVisible}>
                    <Topbar
                        account={account}
                        showMenuButton={!docked}
                        menuOpen={drawerVisible}
                        menuControls={sidebarId}
                        menuButtonRef={menuButtonRef}
                        onOpenMenu={openDrawer}
                        onChangePassword={openPassword}
                        onLogout={handleLogout}
                    />
                    <main className={css.main}>
                        <Suspense fallback={<p>{t("loading")}</p>}>
                            <Outlet />
                        </Suspense>
                    </main>
                </div>
            </div>
            {account ? (
                <ChangePasswordDialog
                    open={passwordOpen}
                    email={account.email}
                    onClose={closePassword}
                />
            ) : null}
        </>
    )
}

export default PanelShell
