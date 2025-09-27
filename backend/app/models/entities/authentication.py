from pydantic import BaseModel
import uuid

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: uuid.UUID | None = None
