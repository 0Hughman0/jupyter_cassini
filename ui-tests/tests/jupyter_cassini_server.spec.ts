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

async function createNewChild(page) {
  await page.getByRole('button', { name: 'Create new child of Home' }).click();
  await page.getByLabel('Identifier').click();
  await page.getByLabel('Identifier').fill('1');
  await page.locator('textarea').click();
  await page.locator('textarea').fill('Description.\n\nLine 2.');
  await page.getByRole('button', { name: 'Ok' }).click();
}

test.describe('Cassini-Browser', async () => {
  test.beforeEach(async ({ page }) => {
    // keep in mind that the server is only started once.
    // this means the test isolation isn't great in terms of the state of cassini backend.
    await page.goto('http://localhost:8888/lab?');
    await page.getByLabel('Launcher').getByText('Browser').click();
  });

  test('browser-loaded', async ({ page }) => {
    const searchBox = await page.getByPlaceholder('Search by name');
    expect(searchBox).toBeVisible();

    const homeButton = await page.getByRole('button', { name: 'Go Home' });
    expect(homeButton).toBeVisible();

    const currentTierName = await page
      .locator('span')
      .filter({ hasText: /^Home$/ });
    expect(currentTierName).toBeVisible();

    const childTableHeading = await page.getByRole('heading', { name: 'Home' });
    expect(childTableHeading).toBeVisible();
  });

  test('previewer-loaded', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Save changes to disk' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Fetch from disk' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Open Home' }).nth(1)
    ).toBeVisible();
  });

  test('create-child', async ({ page }) => {
    // create new child
    await createNewChild(page);

    // await page.goto('http://localhost:8888/lab');

    // check new child in table
    expect(
      await page.getByRole('cell', { name: 'WP1', exact: true })
    ).toBeVisible();

    // check loading child in preview
    await page.getByRole('button', { name: 'Preview WP1' }).click();
    await page.getByRole('heading', { name: 'WP1' }).click();
    await page.getByText('Description.Line 2.', { exact: true }).click();

    // check notebook openable
    await page.getByRole('button', { name: 'Open WP1' }).nth(1).click();

    // check notebook opened
    await page.getByLabel('WP1.ipynb').getByText('WP1').nth(1).click();

    // check heading back to browser
    await page.getByRole('tab', { name: 'Launcher' }).click();
    await page.getByLabel('Launcher').getByText('Browser').click();
    expect(
      await page.getByRole('cell', { name: 'WP1', exact: true })
    ).toBeVisible();
  });

  test('tree-view-content', async ({ page }) => {
    expect(
      await page.getByRole('cell', { name: 'Name' }).first()
    ).toBeVisible(); // using first here is kinda dumb.
    expect(await page.getByRole('cell', { name: 'Started' })).toBeVisible();

    expect(
      await page.getByRole('cell', { name: 'Info', exact: true })
    ).toBeVisible();
    expect(await page.getByRole('cell', { name: 'Outcome' })).toBeVisible();
    expect(
      await page.getByRole('cell', { name: 'Edit columns' })
    ).toBeVisible();

    await createNewChild(page);

    const info = await page.getByRole('cell', { name: 'Description.' });

    expect(info.allTextContents).not.toContain('Line 2');

    await page.getByRole('button', { name: 'Preview WP1' }).click();

    // conclusion box...
    await page.getByRole('textbox').nth(3).fill('First Line\n\nline 2');

    // save changes button
    await page.getByRole('button', { name: 'Apply changes' }).nth(1).click();

    await page.getByRole('button', { name: 'Save changes to disk' }).click();

    await page
      .getByRole('button', {
        name: 'Refresh tree (will fetch changes from server)'
      })
      .click();
    expect(await page.getByRole('cell', { name: 'First Line' })).toBeVisible();
  });

  test('highlights', async ({ page }) => {
    // create new child
    await createNewChild(page);

    // check notebook openable
    await page.getByRole('button', { name: 'Open WP1' }).click();

    await page.notebook.runCell(0);

    await page
      .getByLabel('Code Cell Content', { exact: true })
      .getByRole('textbox')
      .fill(
        '%%hlt Hlt Test Title\n\n\nprint("Hlt Test Content")\n\n\n"""\nHlt Test label\n"""'
      );
    await page.notebook.runCell(1);
    await page.notebook.waitForRun(1);

    console.log('It exists');
    console.log(await page.contents.fileExists('WorkPackages/.wps/WP1.hlts'));

    await page.getByRole('button', { name: 'Show WP1 in browser' }).click();

    await page.getByRole('button', { name: 'Fetch from disk' }).click();
    await page.getByRole('button', { name: 'Fetch from disk' }).click(); // not sure why needed

    await page.getByRole('heading', { name: 'Hlt Test Title' }).click();
  });
});
