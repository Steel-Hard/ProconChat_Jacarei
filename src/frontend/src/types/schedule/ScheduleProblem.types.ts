type ScheduleProblem =
    | { code: "rangeMissing" }
    | { code: "rangeEndBeforeStart" }
    | { code: "rangeOverlap" }
    | { code: "rangeTooShort"; minutes: number }
    | { code: "seatsOutOfRange" }
    | { code: "windowOutOfRange" }
    | { code: "waitAlertOutOfRange" }
    | { code: "addressRequired" }
    | { code: "addressTooLong" }
    | { code: "complementTooLong" }

export default ScheduleProblem
