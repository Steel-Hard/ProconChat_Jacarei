import { describe, expect, it } from "vitest"
import { bcryptPasswordHasher } from "./passwordHasher"

describe("bcryptPasswordHasher", () => {
    it("gera um hash bcrypt de custo 12 que confere so com a senha certa", async () => {
        const passwordHash = await bcryptPasswordHasher.hash("senha-ficticia")

        expect(passwordHash).toMatch(/^\$2[ab]\$12\$/)
        expect(await bcryptPasswordHasher.compare("senha-ficticia", passwordHash)).toBe(true)
        expect(await bcryptPasswordHasher.compare("outra-senha", passwordHash)).toBe(false)
    })
})
