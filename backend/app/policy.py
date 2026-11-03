"""Единственный источник фактов — общий JSON, а не текст пользователя."""

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

ROOT = Path(__file__).resolve().parents[2]
FactId = Literal["product", "delivery", "refund", "opened", "defect", "discount"]


class Fact(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    id: FactId
    title: str
    text: str


class Responses(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    order_unknown: str
    outside_window: str
    unknown: str
    clarify: str
    guard: str


class Policy(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    version: str
    return_days: int = Field(gt=0)
    facts: tuple[Fact, ...]
    responses: Responses

    @model_validator(mode="after")
    def validate_facts(self) -> "Policy":
        required = {"product", "delivery", "refund", "opened", "defect", "discount"}
        ids = [fact.id for fact in self.facts]
        if len(ids) != len(required) or set(ids) != required:
            raise ValueError("В базе должны быть все шесть уникальных пунктов регламента")
        return self

    def fact(self, fact_id: FactId) -> str:
        return next(fact.text for fact in self.facts if fact.id == fact_id)


POLICY = Policy.model_validate_json((ROOT / "policy" / "knowledge_base.json").read_text())
