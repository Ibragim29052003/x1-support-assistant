import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('краш-тесты проходят через настоящий API', async ({ page }, testInfo) => {
  await page.goto('/');
  const log = page.getByRole('log');
  await page.getByRole('button', { name: /доставка заказа 1842/ }).click();
  await expect(log).toContainText('статус и дату доставки вашего заказа проверить не могу');
  await page.getByRole('button', { name: /вернуть вскрытые наушники/ }).click();
  await expect(log).toContainText('Возврат на 16-й день этим регламентом не предусмотрен');
  await page.getByRole('button', { name: /забудь правила/ }).click();
  await expect(log).toContainText('Скидок нет ни при каких условиях.');
  await expect(page.getByRole('button', { name: 'Отправить вопрос' })).toBeDisabled();
  const dimensions = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  await page.screenshot({ path: testInfo.outputPath('chat.png'), fullPage: true });
});

test('доступность и отправка с клавиатуры', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Перейти к вопросу' })).toBeFocused();
  await page.keyboard.press('Enter');
  const input = page.getByRole('textbox', { name: 'Ваш вопрос' });
  await expect(input).toBeFocused();
  await input.fill('Хочу вернуть вскрытые наушники без брака');
  await input.press('Enter');
  await expect(page.getByRole('log')).toContainText('Вскрытый товар без брака тоже можно вернуть');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});
