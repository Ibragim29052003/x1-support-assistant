import { useEffect, useRef, useState } from 'react';
import { Composer } from './components/Composer';
import { Knowledge } from './components/Knowledge';
import { Message } from './components/Message';
import type { ChatMessage } from './components/Message';
import { askAssistant } from './lib/api';
import { EXAMPLES, WELCOME } from './lib/policy';

function initialMessages(): ChatMessage[] {
  return [{ id: 'welcome', role: 'assistant', text: WELCOME }];
}

export function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
  }, [messages, busy]);

  async function send(message: string, retry = false): Promise<boolean> {
    if (request.current) return false;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    setFailedQuestion(null);
    if (!retry)
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: 'user', text: message },
      ]);
    try {
      const response = await askAssistant(message, controller.signal);
      if (controller.signal.aborted) return false;
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: 'assistant', text: response.answer, response },
      ]);
      return true;
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(
          caught instanceof Error && caught.name !== 'TimeoutError'
            ? caught.message
            : 'Сервер долго не отвечает. Попробуйте ещё раз.',
        );
        setFailedQuestion(message);
      }
      return false;
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  function reset() {
    request.current?.abort();
    request.current = null;
    setMessages(initialMessages());
    setError('');
    setFailedQuestion(null);
    setBusy(false);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#message">
        Перейти к вопросу
      </a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="X1 — главная">
          <span className="brand-mark" aria-hidden="true">
            x1
          </span>
          <span>
            Магазин
            <br />
            <strong>на связи.</strong>
          </span>
        </a>
        <span className="header-caption">Поддержка покупателей</span>
        <span className="prototype-label">Прототип</span>
      </header>
      <main className="workspace">
        <section className="chat-section" aria-labelledby="chat-heading">
          <div className="section-top">
            <span className="eyebrow">Поможем разобраться</span>
            <span className="availability">
              <span aria-hidden="true" />
              По регламенту
            </span>
          </div>
          <div className="chat-heading">
            <h1 id="chat-heading">
              Есть вопрос?
              <br />
              <span>Давайте разберёмся.</span>
            </h1>
          </div>
          <p className="intro">О товаре, доставке и возврате — только то, что известно магазину.</p>
          <div className="conversation">
            <div className="conversation-toolbar">
              <h2>Диалог с ассистентом</h2>
              <button className="text-button" type="button" onClick={reset}>
                Очистить
              </button>
            </div>
            <div
              className="messages"
              role="log"
              aria-label="История диалога"
              aria-live="polite"
              aria-relevant="additions"
              tabIndex={0}
            >
              {messages.map((message) => (
                <Message key={message.id} message={message} />
              ))}
              <div ref={bottom} />
            </div>
            <div className="request-status" role="status">
              {busy ? 'Готовим ответ…' : ''}
            </div>
            {error && (
              <div className="request-error" role="alert">
                <p>{error}</p>
                {failedQuestion && (
                  <button
                    type="button"
                    onClick={() => void send(failedQuestion, true)}
                    disabled={busy}
                  >
                    Повторить запрос
                  </button>
                )}
              </div>
            )}
            <div className="examples">
              <p>Попробуйте спросить</p>
              <div>
                {EXAMPLES.map((example, index) => (
                  <button
                    type="button"
                    key={example}
                    disabled={busy}
                    onClick={() => void send(example)}
                  >
                    <span aria-hidden="true">0{index + 1}</span>
                    {example}
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </div>
            <Composer busy={busy} onSend={send} />
          </div>
          <p className="chat-note">
            Пишите вопрос целиком: каждое сообщение обрабатывается отдельно. Ассистент не оформляет
            заказы и возвраты.
          </p>
        </section>
        <Knowledge />
      </main>
      <footer className="site-footer">
        <span>X1 / Поддержка</span>
        <span>Условия магазина — в регламенте справа или ниже</span>
      </footer>
    </div>
  );
}
