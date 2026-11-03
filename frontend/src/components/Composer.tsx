import { useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { MAX_MESSAGE_LENGTH } from '../lib/policy';

interface Props {
  busy: boolean;
  onSend: (message: string) => Promise<boolean>;
}

export function Composer({ busy, onSend }: Props) {
  const [draft, setDraft] = useState('');
  const [validation, setValidation] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submission = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || submission.current) return;
    const message = draft.trim();
    if (!/[\p{L}\p{N}]/u.test(message)) {
      setValidation('Напишите вопрос словами.');
      inputRef.current?.focus();
      return;
    }
    submission.current = true;
    const accepted = await onSend(message);
    submission.current = false;
    if (accepted) setDraft('');
    inputRef.current?.focus();
  }

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form className="composer" onSubmit={submit} aria-label="Задать вопрос">
      <label htmlFor="message">Ваш вопрос</label>
      <div className="composer-input">
        <textarea
          id="message"
          ref={inputRef}
          value={draft}
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Например, можно ли вернуть вскрытые наушники?"
          aria-describedby="message-help message-validation"
          aria-invalid={Boolean(validation)}
          readOnly={busy}
          onChange={(event) => {
            setDraft(event.target.value);
            setValidation('');
          }}
          onKeyDown={handleKey}
        />
        <button
          className="send-button"
          type="submit"
          disabled={busy || !draft.trim()}
          aria-label="Отправить вопрос"
        >
          <span aria-hidden="true">↑</span>
        </button>
      </div>
      <div className="input-help" id="message-help">
        <span>Enter — отправить · Shift + Enter — новая строка</span>
        <span>
          {draft.length} / {MAX_MESSAGE_LENGTH}
        </span>
      </div>
      <p className="validation" id="message-validation" role="alert">
        {validation}
      </p>
    </form>
  );
}
