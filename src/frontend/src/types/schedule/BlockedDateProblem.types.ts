type BlockedDateProblem =
    | { code: "dateRequired" }
    | { code: "dateAlreadyBlocked" }
    | { code: "dateHasAppointments"; count: number }
    | { code: "descriptionRequired" }
    | { code: "descriptionTooLong" }
    | { code: "periodRequired" }
    | { code: "periodInvalid" }

export default BlockedDateProblem
