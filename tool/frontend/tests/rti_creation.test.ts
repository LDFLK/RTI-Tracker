import { test, expect } from '@playwright/test';

test.describe('RTI Request Creation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/rti-requests');
  });

  test('should validate required fields in creation flow', async ({ page }) => {
    // Click Add RTI Request
    await page.getByRole('button', { name: 'New RTI Request' }).click();
    await expect(page.getByText('Create New RTI Request')).toBeVisible();

    // Step 1: Choose Start from Scratch
    await page.getByText('New Document').click();

    // Step 2: Try to continue without filling data
    await page.getByRole('button', { name: 'Continue' }).click();

    // Verify error messages
    await expect(page.getByText('Request title is required')).toBeVisible();
    await expect(page.getByText('Please select a sender')).toBeVisible();
    await expect(page.getByText('Please select a receiver')).toBeVisible();
  });

  test('should successfully create an RTI request and verify details and history', async ({ page }) => {
    const rtiTitle = `Test RTI ${Math.floor(Math.random() * 1000)}`;
    const rtiDescription = 'This is a test description for Playwright.';

    // Click Add RTI Request
    await page.getByRole('button', { name: 'New RTI Request' }).click();

    // Step 1: Choose Start from Scratch
    await page.getByText('New Document').click();

    // Step 2: Fill Details
    await page.getByLabel('Request Title').fill(rtiTitle);
    await page.getByLabel('Description').fill(rtiDescription);

    // Select Sender
    const senderInput = page.getByPlaceholder('Search for a sender...');
    await senderInput.click();
    await page.getByText('Lanka Data Foundation').click();

    // Select Receiver
    const receiverInput = page.getByPlaceholder('Search for a receiver...');
    await receiverInput.click();
    await page.getByText('Ministry of Finance - Public Information Officer').click();

    // Continue to Step 3
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Finalize
    await expect(page.getByText('Document Finalization')).toBeVisible();
    await expect(page.getByText(rtiTitle)).toBeVisible();

    // Click Dispatch & Download
    // Note: PDF download might trigger a browser dialog or just download. 
    // We mainly care about the navigation back to list and the record creation.
    await page.getByRole('button', { name: 'Dispatch & Download' }).click();

    // Verify redirect to list
    await expect(page.getByRole('heading', { name: 'RTI Requests' })).toBeVisible();
    await expect(page.getByText('RTI request dispatched and PDF downloaded')).toBeVisible();

    // Verify the new RTI is in the list
    await expect(page.getByText(rtiTitle)).toBeVisible();

    // Navigate to Details page
    const row = page.locator('tr').filter({ hasText: rtiTitle });
    await row.getByTitle('View').click();

    // Verify RTI Details
    await expect(page.getByRole('heading', { name: rtiTitle })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(rtiDescription)).toBeVisible();
    await expect(page.getByText('Lanka Data Foundation')).toBeVisible();
    await expect(page.getByText('Ministry of Finance')).toBeVisible();
    await expect(page.getByText('Public Information Officer')).toBeVisible();

    // Verify History/Timeline
    await expect(page.getByRole('heading', { name: 'Life-Cycle Timeline' })).toBeVisible({ timeout: 10000 });
    
    // Check for the history description and status
    // Check for the history description and "Active" status
    await expect(page.getByText('Initial RTI Request created.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Active')).toBeVisible();
  });

  test('should allow creating RTI from a template', async ({ page }) => {
    const rtiTitle = `Template RTI ${Math.floor(Math.random() * 1000)}`;

    await page.getByRole('button', { name: 'New RTI Request' }).click();

    // Step 1: Use a Template
    await page.getByText('Use a Template').click();
    await page.getByText('Standard Environmental Data Request').click();

    // Step 2: Fill Details (Title is pre-filled from template title, but we'll override)
    await page.getByLabel('Request Title').fill(rtiTitle);

    // Select Sender
    await page.getByPlaceholder('Search for a sender...').click();
    await page.getByText('Lanka Data Foundation').click();

    // Select Receiver
    await page.getByPlaceholder('Search for a receiver...').click();
    await page.getByText('Ministry of Finance - Public Information Officer').click();

    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Verify content loaded from template
    await expect(page.getByText('I am writing to request information under the Right to Information Act regarding environmental data')).toBeVisible();

    await page.getByRole('button', { name: 'Dispatch & Download' }).click();
    await expect(page.getByText(rtiTitle)).toBeVisible();
  });

});
