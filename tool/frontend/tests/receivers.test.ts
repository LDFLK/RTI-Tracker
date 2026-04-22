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

  test('validates email and contact number requirements', async ({ page }) => {
    await page.getByRole('button', { name: 'New Receiver' }).click();

    const emailInput = page.getByPlaceholder('receiver@example.com');
    const phoneInput = page.getByPlaceholder('07xxxxxxxx or +94xxxxxxxxx');
    const submitBtn = page.getByRole('button', { name: 'Create Receiver' });

    // 1. Try to submit empty 
    await submitBtn.click();
    await expect(page.getByText('Email or Contact No is required')).toBeVisible();
    await expect(page.getByText('Institution is required')).toBeVisible();
    await expect(page.getByText('Position is required')).toBeVisible();

    // 2. invalid email formats
    await emailInput.fill('test@example');
    await submitBtn.click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    await emailInput.fill('testexample.com');
    await submitBtn.click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    await emailInput.fill('');

    // 3. invalid Sri Lankan phone number
    await phoneInput.fill('123456');
    await submitBtn.click();
    await expect(page.getByText(/Please enter a valid Sri Lankan phone number \(e\.g\. 0771234567 or \+94771234567\)/)).toBeVisible();

    // 4. +94 prefix format
    await phoneInput.fill('+94771234567');
    await expect(page.getByText(/Please enter a valid Sri Lankan phone number \(e\.g\. 0771234567 or \+94771234567\)/)).not.toBeVisible();

    // 7. hyphen stripping 
    await phoneInput.fill('077-123-4567');
    await expect(phoneInput).toHaveValue('0771234567');
    await expect(page.getByText(/Please enter a valid Sri Lankan phone number \(e\.g\. 0771234567 or \+94771234567\)/)).not.toBeVisible();

    // 8. positioning (Input filter)
    await phoneInput.fill('07+7123');
    await expect(phoneInput).toHaveValue('077123');

    // 9. Verify address is optional
    const addressInput = page.getByPlaceholder('Address (optional)');
    await addressInput.fill('');

    // Fill required fields to verify final submission
    const instWrapper = page.locator('.relative').filter({ has: page.getByPlaceholder('Select institution') });
    await instWrapper.getByPlaceholder('Select institution').click();
    const instOption = instWrapper.locator('.absolute .cursor-pointer').first();
    await expect(instOption).toBeVisible();
    await instOption.click();

    const posWrapper = page.locator('.relative').filter({ has: page.getByPlaceholder('Select position') });
    await posWrapper.getByPlaceholder('Select position').click();
    const posOption = posWrapper.locator('.absolute .cursor-pointer').first();
    await expect(posOption).toBeVisible();
    await posOption.click();

    await phoneInput.fill('0771234567');
    await emailInput.fill('final@example.com');
    await submitBtn.click();
    await expect(page.getByText('Receiver created')).toBeVisible();
  });

});
