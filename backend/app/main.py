from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.assistant import Answer, answer_message

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
app = FastAPI(title="X1 · ассистент магазина", version="0.1.0")


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(min_length=1, max_length=2000)

    @field_validator("message")
    @classmethod
    def meaningful_text(cls, value: str) -> str:
        value = value.strip()
        if not value or not any(char.isalnum() for char in value):
            raise ValueError("Напишите вопрос словами")
        return value


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", response_model=Answer)
def chat(request: ChatRequest) -> Answer:
    return answer_message(request.message)


if DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/", include_in_schema=False)
    def frontend() -> FileResponse:
        return FileResponse(DIST / "index.html")
