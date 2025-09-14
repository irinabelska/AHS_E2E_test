import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { Building, BuildingName, getBuildingForQaEnv } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { SettingsPage } from '@/tests/playwright/framework/pages/portfolioview/adminsettings/settings/SettingsPage';
import { isDbrDashboardPage } from '@/tests/playwright/framework/pages/buildingview/dashboard/DbrDashboardPage';
import { isAboundDashboardPage } from '@/tests/playwright/framework/pages/buildingview/dashboard/AboundDashboardPage';
import { openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { step, test } from '@/tests/playwright/framework/TestConfig';
import { BuildingStandards } from '@/tests/playwright/framework/entities/BuildingStandards';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';

test.describe(
  'Admin Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Settings', () => {
      interface TestConfig {
        building: Building;
        dashboardName: string;
      }

      const CONFIGS: Map<Env, TestConfig> = new Map<Env, TestConfig>([
        [Env.LOCAL, { building: getBuildingForQaEnv(BuildingName.CIB), dashboardName: 'mateusz_demo' }],
        [Env.DEV, { building: getBuildingForQaEnv(BuildingName.ALC_NY_MAIN), dashboardName: 'mateusz_demo' }],
        [Env.QA, { building: getBuildingForQaEnv(BuildingName.CIB), dashboardName: 'mateusz_demo' }],
        [Env.PRE_PROD, { building: getBuildingForQaEnv(BuildingName.CIB), dashboardName: 'mateusz_demo' }],
      ]);

      const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

      const knownIssues: KnownIssue[] = [
        new KnownIssue(
          'https://carrier-digital.atlassian.net/browse/ABOUND-19178',
          expectedException(Error, ".*locator count greater then 0, locator=locator\\('.MuiAutocomplete-option'\\).*"),
          'skipping due to unstable data on DBR / Insight side',
        ),
      ];

      test('homepage set in portfolio view settings, properly displayed as dashboard in building view', async ({
        globalAdminPage,
        withKnownIssues,
      }) => {
        await withKnownIssues(knownIssues).run(async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16173', 'ABOUND-16173');
          test.skip(
            true,
            'skipping due to unstable data on DBR / Insight side: https://carrier-digital.atlassian.net/browse/ABOUND-19178',
          );
          test.skip(globalAdminPage.getBrowserName() === 'firefox', 'as for now dbr does not support firefox');

          const dashboardName = CONFIG.dashboardName;
          const customer = getCustomerForEnv(CONFIG.building.site.customerName);
          const standard = await BuildingStandards.getApiSelectedIaqStandard(customer);

          let settingsPage: SettingsPage = await step(
            `set dashboard ${dashboardName} for client ${customer.name}`,
            async () => {
              return openPortfolioView(globalAdminPage, { homepageAvailable: true })
                .then((p) => p.topBar.selectSite(CONFIG.building.site.name))
                .then((p) => p.portfolioViewSideMenu.openPvAdminSettings(p, globalAdminPage, standard))
                .then((p) => p.settingsTabBar.openSettings())
                .then((p) => p.setDashboard(dashboardName));
            },
          );

          const dashboardPage = await step(
            `dbr dashboard is visible for building belonging to customer ${customer.name}`,
            async () => {
              const dashboardPage = await settingsPage
                .clickAboundHomePage()
                .then((_) => _.buildingViewSideMenu.openDashboardPage());

              expect(isDbrDashboardPage(dashboardPage)).toBeTruthy();

              return dashboardPage;
            },
          );

          settingsPage = await step('reset dashboard to default abound dashboard', async () => {
            const standard = await BuildingStandards.getApiSelectedIaqStandard(customer);
            const settingsPage: SettingsPage = await dashboardPage.topBar
              .openPortfolioOverview()
              .then((_) => _.portfolioViewSideMenu.openPvAdminSettings(_, globalAdminPage, standard))
              .then((_) => _.settingsTabBar.openSettings())
              .then((_) => _.unsetDashboard());

            expect(settingsPage.currentHomepage).toEqual('');

            return settingsPage;
          });

          await step(`abound dashboard is visible for building belonging to customer ${customer.name}`, async () => {
            const dashboardPage = await settingsPage
              .clickAboundHomePage()
              .then((_) => _.openBuildingView(CONFIG.building.name))
              .then((_) => _.buildingViewSideMenu.openDashboardPage());

            expect(isAboundDashboardPage(dashboardPage)).toBeTruthy();
          });
        });
      });
    });
  },
);
