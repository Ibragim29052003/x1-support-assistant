# Ассистент магазина X1

Тестовое: веб-чат, который отвечает по шести пунктам регламента магазина.
React + TypeScript, FastAPI. Ответы собираются из проверенных шаблонов, без
LLM и внешних API. Если данных нет, бот сообщает об этом, а не придумывает ответ.

## Запуск

С Docker:

```sh
docker build -t x1-support .
docker run --rm -p 127.0.0.1:8000:8000 x1-support
```

Открыть [localhost:8000](http://localhost:8000).

Без Docker нужны Python 3.12+, [uv](https://docs.astral.sh/uv/getting-started/installation/)
и Node.js 24 LTS:

```sh
uv sync --project backend --frozen
cd frontend
npm ci
npm run build
cd ..
uv run --project backend uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Для разработки запустить API той же командой с `--reload`, а во втором терминале —
`cd frontend && npm run dev`. Vite проксирует `/api` на порт 8000.

## Материалы задания

- [База регламента](policy/knowledge_base.json) — общий источник для API и интерфейса.
- [Системный промпт](policy/system_prompt.md) — инструкция для LLM-версии; в прототипе модель не вызывается.
- [Готовый текст решения и фактический краш-тест](docs/submission.md).

## Проверка

```sh
uv run --project backend pytest backend/tests -q
uv run --project backend ruff check backend scripts
uv run --project backend ruff format --check backend scripts
cd frontend
npm test
npm run lint
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e
```

Повторить краш-тест при запущенном API:

```sh
python3 scripts/crash_test.py --output docs/submission.md
```

API: `POST /api/chat` с `{"message": "Ваш вопрос"}`. Схема — `/docs`,
проверка состояния — `/api/health`. Ключи и переменные окружения не нужны.

Каждое сообщение обрабатывается отдельно. Бот распознаёт явные формулировки;
произвольный пересказ может не распознаться. Заказы не проверяет, возвраты не
оформляет, историю на сервере не хранит. Повторный запрос не меняет состояние,
поэтому отдельного хранилища ключей идемпотентности здесь нет.
