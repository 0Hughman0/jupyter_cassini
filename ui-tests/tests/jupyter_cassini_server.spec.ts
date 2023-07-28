import { expect, test } from '@jupyterlab/galata';

/**
 * Don't load JupyterLab webpage before running the tests.
 * This is required to ensure we capture all log messages.
 */
test.use({ autoGoto: false });

test('Extension activates', async ({ page }) => {
  const logs: string[] = [];

  page.on('console', message => {
    logs.push(message.text());
  });

  await page.goto();

  expect(
    logs.filter(
      s =>
        s ===
        'JupyterLab extension jupyter-cassini is activated holy cow that was hard!'
    )
  ).toHaveLength(1);
});

test('Launcher Available', async ({ page }) => {
  await page.goto('http://localhost:8888/lab?');
  const launcherButton = await page.getByLabel('Launcher').getByText('Browser'); // fails if two launchers are open!
  expect(launcherButton).toBeVisible();
  await launcherButton.click();
});

test.describe('Cassini Browser', async () => {
  test.beforeAll(async ({ page }) => {
    await page.goto('http://localhost:8888/lab?');
    await page.getByLabel('Launcher').getByText('Browser').click();
  });
});
