import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { BuildingName } from '@/tests/playwright/framework/entities/Buildings';
import { step, test } from '@/tests/playwright/framework/TestConfig';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { EnergyUtilityMetersPage } from '@/tests/playwright/framework/pages/buildingview/energy/utilityMeters/EnergyUtilityMetersPage';
import { Currencies } from '@/tests/playwright/framework/entities/Currencies';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';

test.describe(
  'Energy',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    const issues: KnownIssue[] = [];

    test('global admin should be able to manage the budget, crud operation', async ({
      globalAdminPage,
      withKnownIssues,
    }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9465', 'ABOUND-9465');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9466', 'ABOUND-9466');
      await withKnownIssues(issues).run(async () => {
        const energyPage: EnergyUtilityMetersPage = await step('set the building and user currency = USD', async () => {
          return openBuildingView(globalAdminPage, {
            buildingName: BuildingName.CIB,
            featureFlags: { utilityMetersTabAvailable: true },
          })
            .then((_) => _.buildingViewSideMenu.openSettingsPage())
            .then((_) => _.setUserCurrency(Currencies.USD))
            .then((_) => _.settingsSideMenu.openEnergyManagementPage())
            .then((_) => _.setCurrency(Currencies.USD))
            .then((_) => _.buildingViewSideMenu.openEnergyPage());
        });

        let yearlyBudgetComponent = await energyPage
          .openSpendMode()
          .then((_) => _.getTotalSpendComponent())
          .then((_) => _.getAnnualBudgetComponent());

        yearlyBudgetComponent = await step('remove budget if there is one', async () => {
          const yearlyBudget = await yearlyBudgetComponent.getBudget();

          if (yearlyBudget !== null) {
            yearlyBudgetComponent = await yearlyBudgetComponent.removeBudget();
          }

          return yearlyBudgetComponent;
        });

        yearlyBudgetComponent = await step('add yearly budget = 1000 USD', async () => {
          yearlyBudgetComponent = await yearlyBudgetComponent.addBudget(1000);
          const budget = await yearlyBudgetComponent.getBudget();

          expect(budget?.plannedExpenses.value).toEqual(1000);
          expect(budget?.plannedExpenses.currency).toEqual(Currencies.USD);

          return yearlyBudgetComponent;
        });

        yearlyBudgetComponent = await step('edit yearly budget to set 1001 USD', async () => {
          yearlyBudgetComponent = await yearlyBudgetComponent.editBudget(1001);
          const budget = await yearlyBudgetComponent.getBudget();

          expect(budget?.plannedExpenses.value).toEqual(1001);
          expect(budget?.plannedExpenses.currency).toEqual(Currencies.USD);

          return yearlyBudgetComponent;
        });

        await step('remove the created yearly budget', async () => {
          yearlyBudgetComponent = await yearlyBudgetComponent.removeBudget();

          expect(yearlyBudgetComponent.getBudget()).toBeNull();
        });
      });
    });
  },
);
