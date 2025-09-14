import { expect } from '@playwright/test';

import { openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe(
  'Admin Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('User Management', () => {
      test('user management page is displayed properly', async ({ globalAdminPage }) => {
        const userManagementPage = await openPortfolioView(globalAdminPage)
          .then((p) => p.portfolioViewSideMenu.openPvAdminSettings(p, globalAdminPage))
          .then((p) => p.settingsTabBar.openUserManagement());

        expect(userManagementPage).toBeTruthy();
      });
    });
  },
);
