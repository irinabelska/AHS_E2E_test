import { allure } from 'allure-playwright';
import { expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { UserRole } from '@/tests/playwright/framework/entities/UserRole';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { UserManagementSubpage } from '@/tests/playwright/framework/pages/portfolioview/adminsettings/userManagement/UserManagementSubpage';
import { UserInviteRequest } from '@/tests/playwright/framework/pages/portfolioview/adminsettings/userManagement/UserInviteRequest';
import { UserUpdateRequest } from '@/tests/playwright/framework/pages/portfolioview/adminsettings/userManagement/UserUpdateRequest';
import { openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import { UserStatus } from '@/tests/playwright/framework/entities/UserStatus';
import { Site, getCurrentEnvSiteByName } from '@/tests/playwright/framework/entities/Site';
import { SiteName } from '@/tests/playwright/framework/entities/SiteName';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

test.describe(
  'Admin Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('User Management', () => {
      function createInviteRequest(site: Site) {
        const firstName = `e2e-${faker.person.firstName()}`;
        const lastName = `e2e-${faker.person.lastName()}`;
        const email = `e2e-${faker.string.alphanumeric(10)}@carrier.com`;

        return new UserInviteRequest(
          email,
          firstName,
          lastName,
          UserRole.MEMBER,
          new Array(getCustomerForEnv(site.customerName)),
          new Array(site),
        );
      }

      const USER_INVITE_REQUESTS = new Map<Env, SiteName>([
        [Env.LOCAL, SiteName.ALC_NY_BRANCH],
        [Env.DEV, SiteName.AUTOMATED_LOGIC_HQ],
        [Env.QA, SiteName.ALC_NY_BRANCH],
        [Env.PRE_PROD, SiteName.CHVAC],
      ]);

      const inviteRequest = createInviteRequest(
        getCurrentEnvSiteByName(forceGetFromMap(USER_INVITE_REQUESTS, getCurrentEnv())),
      );
      let userManagementPage: UserManagementSubpage;

      test.beforeEach(async ({ globalAdminPage }) => {
        userManagementPage = await openPortfolioView(globalAdminPage)
          .then((_) => _.selectSite(inviteRequest.sites![0].name))
          .then((_) => _.portfolioViewSideMenu.openPvAdminSettings(_, globalAdminPage))
          .then((_) => _.settingsTabBar.openUserManagement());
      });

      test('Verify that new user can be invited/updated/enabled/disabled/deleted', async () => {
        const updateRequest = UserUpdateRequest.fromInviteRequest(inviteRequest);
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9494', 'ABOUND-9494');

        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-10070', 'ABOUND-10070');
        await userManagementPage.inviteUser(inviteRequest);
        await userManagementPage.searchUser(inviteRequest.email);
        expect((await userManagementPage.getVisibleUsers(1))[0]).toEqual(inviteRequest.toUserInfo());

        allure.link(' https://carrier-digital.atlassian.net/browse/ABOUND-10739', 'ABOUND-10739');
        await userManagementPage.updateUser(inviteRequest.email, updateRequest);
        await userManagementPage.searchUser(updateRequest.lastName);
        expect((await userManagementPage.getVisibleUsers(1))[0]).toEqual(updateRequest.toUserInfo(inviteRequest.email));

        allure.link(' https://carrier-digital.atlassian.net/browse/ABOUND-9853', 'ABOUND-9853');
        await userManagementPage.disableUser(inviteRequest.email);
        expect((await userManagementPage.getVisibleUsers(1))[0].status).toEqual(UserStatus.DISABLED);

        allure.link(' https://carrier-digital.atlassian.net/browse/ABOUND-9853', 'ABOUND-9853');
        await userManagementPage.enableUser(inviteRequest.email);
        expect((await userManagementPage.getVisibleUsers(1))[0].status).toEqual(UserStatus.INVITED);

        allure.link(' https://carrier-digital.atlassian.net/browse/ABOUND-9854', 'ABOUND-9854');
        await userManagementPage.deleteUser(inviteRequest.email);
      });
    });
  },
);
