type BlockedDateProblem =
    | { code: "dateRequired" }
    | { code: "dateAlreadyBlocked" }
    | { code: "dateHasAppointments"; count: number }
    | { code: "descriptionRequired" }
    | { code: "descriptionTooLong" }

export default BlockedDateProblem
