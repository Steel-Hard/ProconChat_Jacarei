const CONTROL_CHARS = /[\r\n\t]/

export default function hasControlChars(value: string): boolean {
    return CONTROL_CHARS.test(value)
}
