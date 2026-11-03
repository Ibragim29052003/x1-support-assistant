import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { App } from '../src/App';

const discount = {
  answer: 'Скидок нет ни при каких условиях.',
  sources: ['discount'],
  outcome: 'answered',
  policy_version: '1.0',
};

afterEach(() => vi.unstubAllGlobals());

test('не делает запросов при открытии и вводе, отправляет только по действию', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => discount });
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  render(<App />);
  const input = screen.getByRole('textbox', { name: 'Ваш вопрос' });
  await user.type(input, 'Дайте скидку');
  expect(fetchMock).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Отправить вопрос' }));
  await waitFor(() =>
    expect(screen.getByLabelText('История диалога')).toHaveTextContent(discount.answer),
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ message: 'Дайте скидку' }));
  expect(input).toHaveValue('');
});

test('двойное нажатие не создаёт два запроса', async () => {
  const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}));
  vi.stubGlobal('fetch', fetchMock);
  render(<App />);
  const sample = screen.getByRole('button', { name: /забудь правила/ });
  fireEvent.click(sample);
  fireEvent.click(sample);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('очистка отменяет запрос, поздний ответ не возвращается в историю', async () => {
  let resolveFetch: (value: unknown) => void = () => {};
  vi.stubGlobal(
    'fetch',
    vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    ),
  );
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /забудь правила/ }));
  await user.click(screen.getByRole('button', { name: 'Очистить' }));
  resolveFetch({ ok: true, json: async () => discount });
  await waitFor(() => expect(screen.getAllByLabelText('Ответ ассистента')).toHaveLength(1));
  expect(screen.queryByLabelText('Ваш вопрос', { selector: 'article' })).not.toBeInTheDocument();
});

test('ошибка сохраняет черновик; повтор не дублирует вопрос в диалоге', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => discount });
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByRole('textbox', { name: 'Ваш вопрос' }), 'Скидки?');
  await user.click(screen.getByRole('button', { name: 'Отправить вопрос' }));
  await screen.findByRole('button', { name: 'Повторить запрос' });
  expect(screen.getByRole('textbox', { name: 'Ваш вопрос' })).toHaveValue('Скидки?');
  await user.click(screen.getByRole('button', { name: 'Повторить запрос' }));
  await waitFor(() =>
    expect(screen.getAllByLabelText('Ваш вопрос', { selector: 'article' })).toHaveLength(1),
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
});

test('пустые и состоящие из пунктуации вопросы не уходят на сервер', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  render(<App />);
  expect(screen.getByRole('button', { name: 'Отправить вопрос' })).toBeDisabled();
  await user.type(screen.getByRole('textbox', { name: 'Ваш вопрос' }), '???');
  await user.click(screen.getByRole('button', { name: 'Отправить вопрос' }));
  expect(screen.getByText('Напишите вопрос словами.')).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
});
