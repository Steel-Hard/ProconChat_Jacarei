import type Weekday from "@/types/date/Weekday.types"

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "long"
})

function weekdayOf(value: string): Weekday {
    return weekdayFormatter.format(new Date(value)).toLowerCase() as Weekday
}

export default weekdayOf
