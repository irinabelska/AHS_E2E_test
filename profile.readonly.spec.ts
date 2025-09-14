import { expect, Page } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import { ProfilePage } from '@/tests/playwright/framework/pages/buildingview/settings/profile/ProfilePage';
import { getOktaUserSettingUrl } from '@/tests/playwright/framework/Env';
import { waitForFunction } from '@/tests/playwright/framework/utils/wait.utils';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';

test.describe(
  'Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Profile', () => {
      let profilePage: ProfilePage;

      test.beforeEach(async ({ globalAdminPage }) => {
        profilePage = await openBuildingView(globalAdminPage).then((_) => _.openUserProfile());
      });

      test('Verify Profile Edit sub pages', async ({}) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6100', 'ABOUND-6100');

        const editNamePage = await profilePage.openUpdateNamePage();
        expect(editNamePage).toBeTruthy();

        const editPhonePage = await editNamePage.cancelChanges().then((_) => _.openUpdatePhonePage());
        expect(editPhonePage).toBeTruthy();

        await editPhonePage.cancelChanges().then((_) => _.clickChangePasswordLink());
        await waitForFunction('page should be redirected to okta', editPhonePage.page.playwrightPage, async (p: Page) =>
          Promise.resolve(p.url() === getOktaUserSettingUrl()),
        );
      });
    });
  },
);
