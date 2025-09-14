import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import { openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { FilterPeriods } from '@/tests/playwright/framework/components/abound/DateRangeButtons';
import { PortfolioEnergyUtilityConsumption } from '@/tests/playwright/framework/pages/portfolioview/energyandutilities/submeters/consumption/TotalSubMeterPortfolioData';
import { PortfolioSubMeterEvaluation } from '@/tests/playwright/framework/pages/portfolioview/energyandutilities/submeters/consumption/PortfolioSubMeterEvaluation';

test.describe(
  'Energy & Utilities',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test('All components of the portfolio energy page should be loaded', async ({ globalAdminPage }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9415', 'ABOUND-9415');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9227', 'ABOUND-9227');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9228', 'ABOUND-9228');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9864', 'ABOUND-9864');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9157', 'ABOUND-9157');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-13745', 'ABOUND-13745');

      const portfolioEnergyPage = await openPortfolioView(globalAdminPage, {
        portfolioEnergyUtilitiesAvailable: true,
      }).then((p) => p.portfolioViewSideMenu.openEnergyAndUtilities());

      expect(portfolioEnergyPage.annualBudgetCard.annualBudget.getPercentage()).toBeGreaterThanOrEqual(0);

      const compareModeUtilities = await portfolioEnergyPage.compareMode.switchToCompareUtilities();
      expect(compareModeUtilities.viewMode).toBe('Compare Utilities');
      expect(await compareModeUtilities.getConsumptionAndSpendTable()).toBeTruthy();
      expect(await compareModeUtilities.getEuiAndUuiTable()).toBeTruthy();
      expect(await compareModeUtilities.getEmissionsTable()).toBeTruthy();

      const compareModeBuildings = await compareModeUtilities.switchToCompareBuildings();
      expect(compareModeBuildings.viewMode).toBe('Compare Buildings');
      expect(await compareModeBuildings.getConsumptionAndSpendTable()).toBeTruthy();
      expect(await compareModeBuildings.getEuiAndUuiTable()).toBeTruthy();
      expect(await compareModeBuildings.getEmissionsTable()).toBeTruthy();
    });

    test('All components of portfolio sub meters energy page are correctly loaded', async ({ globalAdminPage }) => {
      test.skip(true, 'needs to be aligned with epic ABOUND-17182');
      const subMetersPortfolioEnergy = await openPortfolioView(globalAdminPage, {
        subMeterConsumptionAvailableForPortfolio: true,
        subMeterTabAvailableForPortfolio: true,
        portfolioEnergyUtilitiesAvailable: true,
      })
        .then((p) => p.portfolioViewSideMenu.openEnergyAndUtilities())
        .then((p) => p.clickSubMetersTab());

      const periods: FilterPeriods[] = ['week', 'month', 'year'];

      for (const period of periods) {
        const periodTotalEnergyAndUtilityConsumption = await subMetersPortfolioEnergy
          .changeViewPeriodTo(period)
          .then((_) => _.getEnergyAndUtilityConsumption());

        const subMeterPortfolioComparison = await subMetersPortfolioEnergy.changeViewPeriodTo(period);
        const portfolioSubMeterEvaluation = subMeterPortfolioComparison.getPortfolioSubMeterEvaluation();

        const energyTypes: (keyof PortfolioEnergyUtilityConsumption)[] = ['electricity', 'gas', 'steam', 'water'];

        for (const energyType of energyTypes) {
          expect(periodTotalEnergyAndUtilityConsumption[energyType].energy?.value).toBeDefined();
          expect(periodTotalEnergyAndUtilityConsumption[energyType].energy?.unit).toBeDefined();
          expect(periodTotalEnergyAndUtilityConsumption[energyType].utility?.value).toBeDefined();
          expect(periodTotalEnergyAndUtilityConsumption[energyType].utility?.unit).toBeDefined();
        }

        const filters = ['Electricity', 'Gas', 'Water', 'Steam'] as const;
        const filterMethods: Record<string, () => Promise<PortfolioSubMeterEvaluation>> = {
          Electricity: portfolioSubMeterEvaluation.clickElectricityFilter.bind(portfolioSubMeterEvaluation),
          Gas: portfolioSubMeterEvaluation.clickGasFilter.bind(portfolioSubMeterEvaluation),
          Water: portfolioSubMeterEvaluation.clickWaterFilter.bind(portfolioSubMeterEvaluation),
          Steam: portfolioSubMeterEvaluation.clickSteamFilter.bind(portfolioSubMeterEvaluation),
        };

        for (const filter of filters) {
          const filterMethod = filterMethods[filter];
          expect(await filterMethod()).toBeTruthy();
        }

        expect(await portfolioSubMeterEvaluation.switchToUtilityUnits()).toBeTruthy();
        expect(await portfolioSubMeterEvaluation.switchToEnergyUnits()).toBeTruthy();
      }
    });
  },
);
