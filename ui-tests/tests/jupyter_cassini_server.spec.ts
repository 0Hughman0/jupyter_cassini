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

test.describe('Cassini-Browser', async () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8888/lab?');
    await page.getByLabel('Launcher').getByText('Browser').click();
  });

  test('browser-loaded', async ({ page }) => {
    
    const searchBox = await page.getByPlaceholder('Search by name');
    expect(searchBox).toBeVisible()

    const homeButton = await page.getByRole('button', { name: 'Go Home' });
    expect(homeButton).toBeVisible()

    const currentTierName = await page.locator('span').filter({ hasText: /^Home$/ });
    expect(currentTierName).toBeVisible()
    
    const childTableHeading = await page.getByRole('heading', { name: 'Home' });
    expect(childTableHeading).toBeVisible()    
  })

  test('previewer-loaded', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save changes to disk' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fetch from disk' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open Home' }).nth(1)).toBeVisible()
  })

  test('create-child', async ({ page }) => {
    // create new child
    await page.getByRole('button', { name: 'Create new child of Home' }).click();
    await page.getByLabel('Identifier').click();
    await page.getByLabel('Identifier').fill('1');
    await page.locator('textarea').click();
    await page.locator('textarea').fill('Description.\n\nLine 2.');
    await page.getByRole('button', { name: 'Ok' }).click();
    

    // await page.goto('http://localhost:8888/lab');

    // check notebook opened
    await page.getByLabel('WP1.ipynb').getByText('WP1', { exact: true }).click();

    // check new child in browser
    await page.getByRole('tab', { name: 'Launcher' }).click();
    await page.getByLabel('Launcher').getByText('Browser').click();
    expect(await page.getByRole('tabpanel').getByText('WP1')).toBeVisible()

    // check loading child in preview
    await page.getByRole('button', { name: 'Preview WP1' }).click();
    await page.getByRole('heading', { name: 'WP1' }).click();
    await page.getByText('Description.Line 2.', { exact: true }).click();
  })
});
