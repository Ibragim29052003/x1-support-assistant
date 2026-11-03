import { FACTS, POLICY_VERSION } from './policy';
import type { FactId } from './policy';

export type Outcome = 'answered' | 'clarify' | 'needs_staff' | 'out_of_scope';
export interface Answer {
  answer: string;
  sources: FactId[];
  outcome: Outcome;
  policy_version: string;
}

function isAnswer(value: unknown): value is Answer {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.answer === 'string' &&
    data.answer.length > 0 &&
    Array.isArray(data.sources) &&
    data.sources.every((id) => FACTS.some((fact) => fact.id === id)) &&
    ['answered', 'clarify', 'needs_staff', 'out_of_scope'].includes(String(data.outcome)) &&
    data.policy_version === POLICY_VERSION
  );
}

export async function askAssistant(message: string, signal: AbortSignal): Promise<Answer> {
  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Нет связи с сервером. Проверьте подключение и повторите вопрос.', {
        cause: error,
      });
    }
    throw error;
  }
  if (!response.ok)
    throw new Error('Не удалось получить ответ. Попробуйте отправить вопрос ещё раз.');
  let result: unknown;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error('Не удалось прочитать ответ сервера. Попробуйте ещё раз.', { cause: error });
  }
  if (!isAnswer(result))
    throw new Error('Сервер вернул неподходящий ответ. Обновите страницу и повторите вопрос.');
  return result;
}
