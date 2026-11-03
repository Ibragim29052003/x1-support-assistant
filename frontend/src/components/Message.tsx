import { memo } from 'react';
import type { Answer } from '../lib/api';
import { FACTS } from '../lib/policy';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  response?: Answer;
}

const STATUS = {
  answered: '',
  clarify: 'Нужно уточнение',
  needs_staff: 'Нужна проверка сотрудником',
  out_of_scope: 'Нет данных в регламенте',
};

export const Message = memo(function Message({ message }: { message: ChatMessage }) {
  const result = message.response;
  return (
    <article
      className={`message message-${message.role}`}
      aria-label={message.role === 'user' ? 'Ваш вопрос' : 'Ответ ассистента'}
    >
      <div className="message-author">{message.role === 'user' ? 'Вы' : 'Ассистент X1'}</div>
      <p>{message.text}</p>
      {result && result.sources.length > 0 && (
        <div className="sources" aria-label="Пункты регламента">
          <span>По регламенту:</span>
          {result.sources.map((id) => (
            <span className="source" key={id}>
              {FACTS.find((fact) => fact.id === id)?.title}
            </span>
          ))}
        </div>
      )}
      {result && STATUS[result.outcome] && (
        <p className="response-status">{STATUS[result.outcome]}</p>
      )}
    </article>
  );
});
