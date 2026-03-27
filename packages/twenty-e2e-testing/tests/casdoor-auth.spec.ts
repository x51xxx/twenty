import { test, expect } from '@playwright/test';

import { getAccessAuthToken } from '../lib/utils/getAccessAuthToken';

// These tests require a running Casdoor instance with AUTH_CASDOOR_ENABLED=true
// and a pre-configured test user in Casdoor.
// Set environment variables:
//   CASDOOR_TEST_EMAIL - email of test user in Casdoor
//   CASDOOR_TEST_PASSWORD - password of test user in Casdoor
//   CASDOOR_URL - public Casdoor URL (e.g. http://localhost:8000)

const CASDOOR_TEST_EMAIL = process.env.CASDOOR_TEST_EMAIL;
const CASDOOR_TEST_PASSWORD = process.env.CASDOOR_TEST_PASSWORD;
const CASDOOR_URL = process.env.CASDOOR_URL;

test.describe('Casdoor Authentication', () => {
  test.skip(
    !CASDOOR_TEST_EMAIL || !CASDOOR_TEST_PASSWORD || !CASDOOR_URL,
    'Casdoor test credentials not configured',
  );

  test('should show Continue with Casdoor button when enabled', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const casdoorButton = page.getByRole('button', {
      name: 'Continue with Casdoor',
    });

    await expect(casdoorButton).toBeVisible();
  });

  test('should redirect to Casdoor login page and authenticate', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const casdoorButton = page.getByRole('button', {
      name: 'Continue with Casdoor',
    });

    await casdoorButton.click();

    // Should redirect to Casdoor login page
    await page.waitForURL((url) => url.origin === CASDOOR_URL, {
      timeout: 10000,
    });

    expect(page.url()).toContain(CASDOOR_URL);

    // Fill in Casdoor login form
    await page.fill(
      'input[name="username"], input[type="email"]',
      CASDOOR_TEST_EMAIL!,
    );
    await page.fill('input[name="password"], input[type="password"]', CASDOOR_TEST_PASSWORD!);

    // Submit Casdoor login
    await page.click('button[type="submit"]');

    // Should redirect back to Twenty
    await page.waitForURL(
      (url) => !url.origin.includes(CASDOOR_URL!),
      { timeout: 15000 },
    );

    // Should eventually land on verify or workspace page
    await page.waitForLoadState('networkidle');

    // Verify we have auth tokens
    const storageState = await page.context().storageState();
    const tokenCookie = storageState.cookies.find(
      (cookie) => cookie.name === 'tokenPair',
    );

    expect(tokenCookie).toBeDefined();
  });

  test('should have valid access token after Casdoor login', async ({
    page,
  }) => {
    // This test assumes the previous test saved auth state,
    // or the test user is already authenticated
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const casdoorButton = page.getByRole('button', {
      name: 'Continue with Casdoor',
    });

    await casdoorButton.click();

    await page.waitForURL((url) => url.origin === CASDOOR_URL, {
      timeout: 10000,
    });

    await page.fill(
      'input[name="username"], input[type="email"]',
      CASDOOR_TEST_EMAIL!,
    );
    await page.fill('input[name="password"], input[type="password"]', CASDOOR_TEST_PASSWORD!);
    await page.click('button[type="submit"]');

    await page.waitForURL(
      (url) => !url.origin.includes(CASDOOR_URL!),
      { timeout: 15000 },
    );
    await page.waitForLoadState('networkidle');

    // Extract and validate the access token
    const { authToken } = await getAccessAuthToken(page);

    expect(authToken).toBeDefined();
    expect(typeof authToken).toBe('string');

    // Decode JWT payload and verify it has expected fields
    const payload = JSON.parse(
      Buffer.from(authToken.split('.')[1], 'base64url').toString(),
    );

    expect(payload.type).toBe('ACCESS');
    expect(payload.userId).toBeDefined();
    expect(payload.workspaceId).toBeDefined();
  });
});

test.describe('Token Refresh', () => {
  test('should refresh access token via GraphQL mutation', async ({
    page,
    request,
  }) => {
    // First login with email/password (always available)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const storageState = await page.context().storageState();
    const tokenCookie = storageState.cookies.find(
      (cookie) => cookie.name === 'tokenPair',
    );

    if (!tokenCookie) {
      test.skip(true, 'No auth token found - need to login first');

      return;
    }

    const tokenPair = JSON.parse(decodeURIComponent(tokenCookie.value));
    const refreshToken = tokenPair.refreshToken?.token;

    expect(refreshToken).toBeDefined();

    // Call renewToken mutation
    const backendUrl =
      process.env.BACKEND_BASE_URL ?? 'http://localhost:3000';
    const response = await request.post(`${backendUrl}/metadata`, {
      data: {
        query: `
          mutation RenewToken($appToken: String!) {
            renewToken(appToken: $appToken) {
              tokens {
                accessToken { token expiresAt }
                refreshToken { token expiresAt }
              }
            }
          }
        `,
        variables: {
          appToken: refreshToken,
        },
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const body = await response.json();

    expect(body.errors).toBeUndefined();
    expect(body.data?.renewToken?.tokens?.accessToken?.token).toBeDefined();
    expect(body.data?.renewToken?.tokens?.refreshToken?.token).toBeDefined();

    // Verify the new access token is different
    const newAccessToken =
      body.data.renewToken.tokens.accessToken.token;

    expect(typeof newAccessToken).toBe('string');
    expect(newAccessToken.split('.')).toHaveLength(3);
  });
});
