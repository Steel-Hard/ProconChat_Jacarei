import { Suspense, useCallback, useEffect, useId, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Outlet } from "react-router-dom"
import Sidebar from "@/components/Sidebar"
import ToastProvider from "@/components/ToastProvider"
import Topbar from "@/components/Topbar"
import useLogout from "@/hooks/useLogout"
import useIsDocked from "@/hooks/useIsDocked"
import useNavBadges from "@/hooks/useNavBadges"
import useAppSelector from "@/store/useAppSelector"
import css from "@/styles/layouts/panel.module.css"

function PanelLayout() {
    const { t } = useTranslation()
    const account = useAppSelector((state) => state.account.current)
    const handleLogout = useLogout()
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
    const drawerRef = useRef<HTMLDivElement>(null)
    const menuButtonRef = useRef<HTMLButtonElement>(null)
    const restoreFocus = useRef(false)

    const closeDrawer = useCallback(() => setDrawerOpen(false), [])

    const dismissDrawer = useCallback(() => {
        restoreFocus.current = true
        setDrawerOpen(false)
    }, [])

    useEffect(() => {
        if (drawerVisible) {
            drawerRef.current?.querySelector<HTMLElement>("a[href]")?.focus()
            return
        }

        if (restoreFocus.current) {
            restoreFocus.current = false
            menuButtonRef.current?.focus()
        }
    }, [drawerVisible])

    useEffect(() => {
        if (!drawerVisible) {
            return
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                dismissDrawer()
            }
        }

        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [drawerVisible, dismissDrawer])

    let sidebarClass = css.sidebarDocked

    if (!docked) {
        sidebarClass = drawerVisible ? `${css.drawer} ${css.drawerOpen}` : css.drawer
    }

    return (
        <ToastProvider>
            <div className={css.shell}>
                <div ref={drawerRef} className={sidebarClass} hidden={!docked && !drawerOpen}>
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
                        onOpenMenu={() => setDrawerOpen(true)}
                        onLogout={handleLogout}
                    />
                    <main className={css.main}>
                        <Suspense fallback={<p>{t("loading")}</p>}>
                            <Outlet />
                        </Suspense>
                    </main>
                </div>
            </div>
        </ToastProvider>
    )
}

export default PanelLayout
