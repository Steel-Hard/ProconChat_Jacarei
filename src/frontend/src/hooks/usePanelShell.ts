import { useCallback, useEffect, useId, useRef, useState } from "react"
import useIsDocked from "@/hooks/useIsDocked"
import useLogout from "@/hooks/useLogout"
import useNavBadges from "@/hooks/useNavBadges"
import useAppSelector from "@/store/useAppSelector"

type SidebarMode = "docked" | "drawer" | "drawerOpen"

function usePanelShell() {
    const account = useAppSelector((state) => state.account.current)
    const handleLogout = useLogout()
    const badges = useNavBadges()
    const docked = useIsDocked()
    const sidebarId = useId()
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [passwordOpen, setPasswordOpen] = useState(false)
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

    const openDrawer = useCallback(() => setDrawerOpen(true), [])
    const closeDrawer = useCallback(() => setDrawerOpen(false), [])
    const openPassword = useCallback(() => setPasswordOpen(true), [])
    const closePassword = useCallback(() => setPasswordOpen(false), [])

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

    let sidebarMode: SidebarMode = "docked"

    if (!docked) {
        sidebarMode = drawerVisible ? "drawerOpen" : "drawer"
    }

    return {
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
    }
}

export default usePanelShell
