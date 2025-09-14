import { LoginPage } from '@/tests/playwright/framework/pages/LoginPage';
import { getDefaultGlobalAdminUser } from '@/tests/playwright/framework/entities/user/TestUser';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe(
  'Login Page',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test('successful login/logout', async ({ page }) => {
      await LoginPage.open(page)
        .then((_) => _.login(getDefaultGlobalAdminUser()))
        .then((_) => _.logout());
    });
  },
);
