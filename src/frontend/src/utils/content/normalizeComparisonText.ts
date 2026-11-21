export default function normalizeComparisonText(value: string): string {
    return value.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}
