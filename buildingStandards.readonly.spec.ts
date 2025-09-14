import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';
import { PvBuildingStandardsPage } from '@/tests/playwright/framework/pages/portfolioview/adminsettings/buildingStandards/PvBuildingStandardsPage';
import { getCustomerBuildings, openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { AuthorizedPage } from '@/tests/playwright/framework/pages/AuthorizedPage';
import { BuildingStandards } from '@/tests/playwright/framework/entities/BuildingStandards';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';

test.describe(
  'Admin Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Building Standards page displays for admins', () => {
      const customer =
        getCurrentEnv() === Env.PROD
          ? getCustomerForEnv(CustomerName.AUTOMATED_LOGIC)
          : getCustomerForEnv(CustomerName.ALC);
      async function openPvBuildingStandardPage(page: AuthorizedPage): Promise<PvBuildingStandardsPage> {
        const standard = await BuildingStandards.getApiSelectedIaqStandard(customer);

        return openPortfolioView(page, { portfolioBuildingStandardsAvailable: true })
          .then((_) => _.portfolioViewSideMenu.openPvAdminSettings(_, page, standard))
          .then((_) => _.settingsTabBar.openPvBuildingStandardsPage(page));
      }

      test(`Portfolio Building Standards page displays for Global admin`, async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15798', 'Epic: Toggle 9F Benchmark');
        await openPvBuildingStandardPage(globalAdminPage);
      });

      test(`Portfolio Building Standards page displays for Customer admin`, async ({ adminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15798', 'Epic: Toggle 9F Benchmark');
        await openPvBuildingStandardPage(adminPage);
      });

      test(`Changes Iaq building standard modal displays`, async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15798', 'Epic: Toggle 9F Benchmark');
        const standard = await BuildingStandards.getApiSelectedIaqStandard(customer);
        const pvBuildingStandardsPage = await openPortfolioView(globalAdminPage, {
          portfolioBuildingStandardsAvailable: true,
          newBvBuildingStandardsAvailable: true,
        })
          .then((_) => _.topBar.selectCustomer(customer.name))
          .then((_) => _.portfolioViewSideMenu.openPvAdminSettings(_, globalAdminPage, standard))
          .then((_) => _.settingsTabBar.openPvBuildingStandardsPage(globalAdminPage));

        const currentStandard = await pvBuildingStandardsPage.getSelectedIaqStandard();
        const standardToChoose = BuildingStandards.getAnyOtherStandard(currentStandard);
        const customerBuildingsCount = (await getCustomerBuildings(customer.id)).length;

        await pvBuildingStandardsPage.getChangeStandardConfirmationModal(standardToChoose, customerBuildingsCount);
      });

      test(`9F thresholds page displays in portfolio view`, async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15798', 'Epic: Toggle 9F Benchmark');
        const standard = await BuildingStandards.getApiSelectedIaqStandard(customer);
        const pvBuildingStandardsPage = await openPortfolioView(globalAdminPage, {
          portfolioBuildingStandardsAvailable: true,
          newBvBuildingStandardsAvailable: true,
        })
          .then((_) => _.topBar.selectCustomer(customer.name))
          .then((_) => _.portfolioViewSideMenu.openPvAdminSettings(_, globalAdminPage, standard))
          .then((_) => _.settingsTabBar.openPvBuildingStandardsPage(globalAdminPage));

        await pvBuildingStandardsPage.open9FStandardThresholds();
      });

      test(`Well thresholds page displays in portfolio view`, async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15798', 'Epic: Toggle 9F Benchmark');
        const standard = await BuildingStandards.getApiSelectedIaqStandard(customer);
        const pvBuildingStandardsPage = await openPortfolioView(globalAdminPage, {
          portfolioBuildingStandardsAvailable: true,
          newBvBuildingStandardsAvailable: true,
        })
          .then((_) => _.topBar.selectCustomer(customer.name))
          .then((_) => _.portfolioViewSideMenu.openPvAdminSettings(_, globalAdminPage, standard))
          .then((_) => _.settingsTabBar.openPvBuildingStandardsPage(globalAdminPage));

        await pvBuildingStandardsPage.openWellStandardThresholds();
      });
    });
  },
);
