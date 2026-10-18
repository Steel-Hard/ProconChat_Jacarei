import AppError from "./AppError"

class SlotFullError extends AppError {
    constructor(message: string = "O horário selecionado não possui mais vagas") {
        super(message, 409, "SLOT_FULL")
    }
}

export default SlotFullError
