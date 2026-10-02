class DataError(Exception):
    """Safe user-facing errors; parser internals and uploaded content are never logged."""

    def __init__(self, message: str, status: int = 400):
        self.message = message
        self.status = status
        super().__init__(message)
