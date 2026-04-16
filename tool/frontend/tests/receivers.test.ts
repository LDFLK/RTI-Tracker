import { test, expect } from '@playwright/test';

test.describe('Receivers Management', () => {

  test.beforeEach(async ({ page }) => {
    // Start at the receivers page
    await page.goto('/receivers');
  });

  test('can switch between tabs', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Receivers' })).toBeVisible();
    
    // Switch to Institutions
    await page.getByRole('button', { name: 'Institutions' }).click();
    await expect(page.getByText('Institution List')).toBeVisible();

    // Switch to Positions
    await page.getByRole('button', { name: 'Positions' }).click();
    await expect(page.getByText('Position List')).toBeVisible();
  });

  test('can create an institution and a position', async ({ page }) => {
    // Create Institution
    await page.getByRole('button', { name: 'Institutions' }).click();
    await page.getByRole('button', { name: 'New Institution' }).click();
    await page.getByPlaceholder('Name').fill('Ministry of Magic');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Institution created')).toBeVisible();
    await expect(page.getByText('Ministry of Magic')).toBeVisible();

    // Create Position
    await page.getByRole('button', { name: 'Positions' }).click();
    await page.getByRole('button', { name: 'New Position' }).click();
    await page.getByPlaceholder('Name').fill('Auror');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Position created')).toBeVisible();
    await expect(page.getByText('Auror')).toBeVisible();
  });

  test('the Quick-Add redirect works correctly', async ({ page }) => {
    // Open Receiver form
    await page.getByRole('button', { name: 'New Receiver' }).click();
    await expect(page.getByRole('heading', { name: 'New Receiver' })).toBeVisible();

    // Type a new institution name into the SearchableSelect to trigger the "Add" option
    const institutionInput = page.getByPlaceholder('Select institution');
    await institutionInput.click();
    await institutionInput.fill('Gringotts Bank');

    // Click the "Add Institution" option that appears in the dropdown
    await page.getByText(/Add Institution.*Gringotts Bank/).click();

    // Should be on Institutions tab now with the small modal open
    await expect(page.getByRole('heading', { name: /New institution/i })).toBeVisible();
    // The name should already be pre-filled from the search query
    await expect(page.getByPlaceholder('Name')).toHaveValue('Gringotts Bank');
    await page.getByRole('button', { name: 'Create' }).click();

    // SHOULD REDIRECT BACK TO RECEIVER MODAL
    await expect(page.getByRole('heading', { name: 'New Receiver' })).toBeVisible();
    
    // Verify Gringotts is selected (SearchableSelect shows the name in the input value)
    await expect(page.getByPlaceholder('Select institution')).toHaveValue('Gringotts Bank');
  });

  test('can search through receivers', async ({ page }) => {
    // Using the mock data 'Ministry of Finance'
    const searchInput = page.getByPlaceholder('Search receivers...');
    await searchInput.fill('Finance');
    
    // Should show results
    await expect(page.getByText('pio.finance@gov.in')).toBeVisible();
    
    // Search something that doesn't exist
    await searchInput.fill('NonExistentDepartment');
    await expect(page.getByText('No data found.')).toBeVisible({ timeout: 10000 });
  });

  test('can delete a receiver', async ({ page }) => {
    // Delete the first row
    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByTitle('Delete').click();

    // Confirm Modal - scope to the dialog overlay to avoid matching row Delete buttons
    const dialog = page.locator('.fixed.inset-0');
    await expect(dialog.getByRole('heading', { name: /Delete receiver\?/i })).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Receiver deleted')).toBeVisible();
  });

});
