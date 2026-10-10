import { useCallback, useEffect, useId, useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "@/components/Sidebar"
import ToastProvider from "@/components/ToastProvider"
import Topbar from "@/components/Topbar"
import { useAccount } from "@/hooks/useAccount"
import { useIsDocked } from "@/hooks/useMediaQuery"
import { useNavBadges } from "@/hooks/useNavBadges"
import { clearAccount } from "@/services/account.service"
import { clearToken } from "@/services/session.service"
import css from "@/styles/layouts/panel.module.css"

function handleLogout() {
    clearToken()
    clearAccount()
}

function PanelLayout() {
    const account = useAccount()
    const badges = useNavBadges()
    const docked = useIsDocked()
    const sidebarId = useId()
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [wasDocked, setWasDocked] = useState(docked)

    if (docked !== wasDocked) {
        setWasDocked(docked)

        if (docked) {
            setDrawerOpen(false)
        }
    }

    const drawerVisible = !docked && drawerOpen

    const closeDrawer = useCallback(() => setDrawerOpen(false), [])

    useEffect(() => {
        if (!drawerVisible) {
            return
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setDrawerOpen(false)
            }
        }

        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [drawerVisible])

    let sidebarClass = css.sidebarDocked

    if (!docked) {
        sidebarClass = drawerVisible ? `${css.drawer} ${css.drawerOpen}` : css.drawer
    }

    return (
        <ToastProvider>
            <div className={css.shell}>
                <div className={sidebarClass} hidden={!docked && !drawerOpen}>
                    <Sidebar
                        id={sidebarId}
                        account={account}
                        badges={badges}
                        onNavigate={closeDrawer}
                    />
                </div>
                {drawerVisible ? (
                    <div role="presentation" className={css.overlay} onClick={closeDrawer} />
                ) : null}
                <div className={css.content}>
                    <Topbar
                        account={account}
                        showMenuButton={!docked}
                        menuOpen={drawerVisible}
                        menuControls={sidebarId}
                        onOpenMenu={() => setDrawerOpen(true)}
                        onLogout={handleLogout}
                    />
                    <main className={css.main}>
                        <Outlet />
                    </main>
                </div>
            </div>
        </ToastProvider>
    )
}

export default PanelLayout
