"""Консервативный маршрутизатор: известный факт, уточнение или отказ от догадки.

Текст запроса никогда не становится инструкцией или источником фактов.
Каждое сообщение независимо: контекст предыдущего не домысливается.
"""

import re
import unicodedata
from typing import Literal

from pydantic import BaseModel

from app.policy import POLICY, FactId

Outcome = Literal["answered", "clarify", "needs_staff", "out_of_scope"]


class Answer(BaseModel):
    answer: str
    sources: list[FactId]
    outcome: Outcome
    policy_version: str


def has(pattern: str, text: str) -> bool:
    return re.search(pattern, text) is not None


def return_day(text: str) -> int | None:
    match = re.search(
        r"\b(\d{1,4})\s*(?:[-–]?\s*(?:й|ый|ой|го|ого))?\s*(?:день|дня|дней|сут)", text
    )
    if match:
        return int(match[1])
    # Словесные сроки, важные для границы возврата. Остальные не угадываем.
    words = {"четырнадцат": 14, "пятнадцат": 15, "шестнадцат": 16}
    for word, day in words.items():
        if has(rf"\b{word}\w*\s+(?:день|дня|дней|сут)", text):
            return day
    return None


def answer_message(message: str) -> Answer:
    text = unicodedata.normalize("NFKC", message).casefold().replace("ё", "е")
    parts: list[str] = []
    sources: list[FactId] = []
    outcome: Outcome = "answered"

    def add(fact_id: FactId) -> None:
        if fact_id not in sources:
            sources.append(fact_id)
            parts.append(POLICY.fact(fact_id))

    discount = has(r"скид\w*|промокод\w*|купон\w*|торг\w*|дешевле|discount", text)
    injection = has(
        r"забудь|игнориру\w*|нов\w*\s+(?:правил|регламент|инструкц)|"
        r"system\s*:|ignore\b|<\|?system|представь\w*|притвор\w*|"
        r"измени\w*\s+(?:правил|регламент)|теперь ты",
        text,
    )
    if injection:
        if discount:
            add("discount")
        else:
            parts.append(POLICY.responses.guard)
        return Answer(
            answer="\n\n".join(parts),
            sources=sources,
            outcome="answered",
            policy_version=POLICY.version,
        )

    if discount:
        add("discount")

    delivery = has(r"достав\w*|курьер\w*|привез\w*|привезти", text)
    order = has(r"заказ\w*|трек\w*|статус\w*|\bгде\b.*(?:посылк|наушник)", text)
    if order:
        parts.append(POLICY.responses.order_unknown)
        outcome = "needs_staff"
    if delivery:
        add("delivery")

    returns = has(r"возврат\w*|верну\w*|верне\w*|вернут\w*|возвращ\w*|сдать|сда\w*\s+обратно", text)
    opened = has(r"вскры\w*|распак\w*|открыт\w*|открыл\w*", text)
    defect = has(r"брак\w*|слома\w*|неисправ\w*|дефект\w*|не\s+работа\w*|экспертиз\w*", text)
    no_defect = has(r"без\s+(?:брак\w*|дефект\w*)|брака\s+нет|не\s+брак\w*", text)
    # Смешанное «без брака, но сломались» остаётся неопределённым.
    if defect and no_defect:
        stripped = re.sub(r"без\s+(?:брак\w*|дефект\w*)|брака\s+нет|не\s+брак\w*", "", text)
        defect = has(
            r"брак\w*|слома\w*|неисправ\w*|дефект\w*|не\s+работа\w*|экспертиз\w*", stripped
        )

    if defect:
        add("defect")
    elif returns or opened:
        day = return_day(text)
        if day is not None and day > POLICY.return_days:
            parts.append(POLICY.responses.outside_window.format(days=POLICY.return_days, day=day))
            sources.extend(["refund", "defect"])
            outcome = "needs_staff"
        else:
            add("opened" if opened else "refund")
            if opened and has(r"деньг\w*|карт\w*|срок\w*|когда", text):
                add("refund")

    product = has(r"цен\w*|стоим\w*|сколько\s+сто\w*|налич\w*|купить|\bx1\b|\bх1\b", text)
    if (
        product
        and not (returns or opened or defect or order)
        and (not delivery or has(r"\bx1\b|\bх1\b|цена,|цена и|цена наушник", text))
    ):
        add("product")

    unsupported = has(
        r"гаранти\w*|адрес\w*|телефон\w*|контакт\w*|рассроч\w*|"
        r"бесплат\w*|характеристик\w*|bluetooth|блюту\w*|самовывоз\w*|"
        r"наличн\w*|друг\w*\s+карт\w*|обмен\w*|погод\w*|политик\w*|"
        r"перевод\w*|переведи|напиши\w*\s+код|оплат\w*|стоим\w*\s+достав\w*|"
        r"сколько\s+сто\w*\s+достав\w*|выходн\w*|праздни\w*",
        text,
    )
    if unsupported:
        parts.append(POLICY.responses.unknown)
        outcome = "out_of_scope"
    if not parts:
        is_followup = has(
            r"^(?:да|нет|а\s+если|а\s+на|почему|а\s+как|можно|когда|а\s+этот)\b", text
        )
        parts.append(POLICY.responses.clarify if is_followup else POLICY.responses.unknown)
        outcome = "clarify" if is_followup else "out_of_scope"

    return Answer(
        answer="\n\n".join(parts),
        sources=list(dict.fromkeys(sources)),
        outcome=outcome,
        policy_version=POLICY.version,
    )
