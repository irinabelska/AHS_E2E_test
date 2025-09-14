import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe(
  'Admin Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Settings', () => {
      test('settings page is displayed properly', async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16173', 'ABOUND-16173');
        const settingsPage = await openPortfolioView(globalAdminPage, { homepageAvailable: true })
          .then((p) => p.portfolioViewSideMenu.openPvAdminSettings(p, globalAdminPage))
          .then((p) => p.settingsTabBar.openSettings());

        expect(settingsPage).toBeTruthy();
      });
    });
  },
);
