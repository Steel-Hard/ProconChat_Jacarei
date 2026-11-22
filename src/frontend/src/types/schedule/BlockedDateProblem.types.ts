type BlockedDateProblem =
    | { code: "dateRequired" }
    | { code: "dateAlreadyBlocked" }
    | { code: "descriptionRequired" }
    | { code: "descriptionTooLong" }
    | { code: "periodRequired" }
    | { code: "periodInvalid" }
    | { code: "periodOverlap" }

export default BlockedDateProblem
