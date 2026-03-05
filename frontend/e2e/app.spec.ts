import { expect, test } from '@playwright/test';

test('dashboard card can navigate to module detail and back', async ({ page }) => {
  await page.goto('/');

  await page.locator('.feature-grid').getByRole('link', { name: /Research Brain/ }).click();
  await expect(page.getByRole('heading', { name: 'Research Brain' })).toBeVisible();

  await page.getByRole('link', { name: '首页总览' }).first().click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: '最近访问' })).toBeVisible();
});

test('ctrl/cmd+k opens command palette and navigates to research brain', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await expect(page.getByLabel('命令面板')).toBeVisible();

  await page.getByTestId('command-search').fill('Research');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL('/modules/research-brain');
  await expect(page.getByRole('heading', { name: 'Research Brain' })).toBeVisible();
});

test('simulate command adds toast and activity event', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await page.getByTestId('command-search').fill('模拟触发 Flow Guardian 休息提醒');
  await page.keyboard.press('Enter');

  await expect(page.locator('.toast-item').getByText('已模拟发送休息提醒，建议进行 3-5 分钟有氧恢复。')).toBeVisible();

  await page.getByRole('link', { name: '活动时间线' }).first().click();
  await expect(page.getByRole('main').getByText('已模拟发送休息提醒，建议进行 3-5 分钟有氧恢复。')).toBeVisible();
});

test('dashboard error state supports retry', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('mock:error:dashboard', '1');
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '加载失败' })).toBeVisible();

  await page.evaluate(() => {
    window.localStorage.removeItem('mock:error:dashboard');
  });

  await page.getByRole('button', { name: '重试' }).click();
  await expect(page.getByRole('heading', { name: '最近访问' })).toBeVisible();
});
