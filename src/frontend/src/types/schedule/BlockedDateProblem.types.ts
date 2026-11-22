type BlockedDateProblem =
    | { code: "dateRequired" }
    | { code: "dateAlreadyBlocked" }
    | { code: "descriptionRequired" }
    | { code: "descriptionTooLong" }

export default BlockedDateProblem
