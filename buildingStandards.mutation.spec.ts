import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import { getCustomerBuildings, openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { BuildingStandards } from '@/tests/playwright/framework/entities/BuildingStandards';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

test.describe('Admin Settings', () => {
  test.describe('Building Standards page mutations', () => {
    test(
      `Global admin selects a customer in the portfolio view then changes Iaq building standard and verifies the result in the building view`,
      {
        tag: ['@regression', '@ui', '@setIaqStandardAlc'],
      },
      async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15798', 'Epic: Toggle 9F Benchmark');

        const customer = getCustomerForEnv(CustomerName.ALC);
        const standard = await BuildingStandards.getApiSelectedIaqStandard(getCustomerForEnv(CustomerName.ALC));
        const pvBuildingStandardsPage = await openPortfolioView(globalAdminPage, {
          portfolioBuildingStandardsAvailable: true,
          newBvBuildingStandardsAvailable: true,
        })
          .then((_) => _.topBar.selectCustomer(customer.name))
          .then((_) => _.portfolioViewSideMenu.openPvAdminSettings(_, globalAdminPage, standard))
          .then((_) => _.settingsTabBar.openPvBuildingStandardsPage(globalAdminPage));

        const currentStandard = await pvBuildingStandardsPage.getSelectedIaqStandard();
        const standardToChoose = BuildingStandards.getAnyOtherStandard(currentStandard);

        await pvBuildingStandardsPage.changeStandard(
          standardToChoose,
          (await getCustomerBuildings(customer.id)).length,
        );

        expect(await pvBuildingStandardsPage.getSelectedIaqStandard()).toEqual(standardToChoose);
        const buildingViewSelectedIaqStandard = await pvBuildingStandardsPage.topBar
          .clickAboundHome()
          .then((_) =>
            _.openBuildingView(
              getBuildingById(getCurrentEnv() !== Env.PRE_PROD ? BuildingName.ALC_NY_MAIN : BuildingName.NY_NJ_OFFICE)
                .name,
            ),
          )
          .then((_) => _.buildingViewSideMenu.openSettingsPage())
          .then((_) => _.settingsSideMenu.openBvBuildingStandardsPage(globalAdminPage))
          .then((_) => _.getSelectedIaqStandard());
        expect(buildingViewSelectedIaqStandard).toEqual(standardToChoose);
      },
    );
  });
});
