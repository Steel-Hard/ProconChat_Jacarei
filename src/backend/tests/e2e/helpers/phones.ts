export const E2E_PHONES = {
    fluxoPrincipal: "5512999990781",
    remarcar: "5512999990782",
    cancelar: "5512999990783",
} as const

export const ALL_E2E_PHONES: string[] = Object.values(E2E_PHONES)

export const E2E_CPFS: Record<keyof typeof E2E_PHONES, string> = {
    fluxoPrincipal: "529.982.247-25",
    remarcar: "111.444.777-35",
    cancelar: "390.533.447-05",
}
