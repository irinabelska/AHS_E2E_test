import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import {
  Building,
  BuildingName,
  getBuildingForDevEnv,
  getBuildingForPreProdEnv,
  getBuildingForQaEnv,
} from '@/tests/playwright/framework/entities/Buildings';
import { Currencies } from '@/tests/playwright/framework/entities/Currencies';
import { SettingsPage } from '@/tests/playwright/framework/pages/buildingview/settings/SettingsPage';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { forceGetFromMap } from '@/framework/utils/map.utils';

test.describe(
  'Currency',
  {
    tag: ['@regression', '@ui', '@parallel', '@journey'],
  },
  () => {
    const issues: KnownIssue[] = [];

    const BUILDINGS = new Map<Env, Building>([
      [Env.PROD, getBuildingForPreProdEnv(BuildingName.CAR_CIB)],
      [Env.PRE_PROD, getBuildingForPreProdEnv(BuildingName.CIB)],
      [Env.QA, getBuildingForQaEnv(BuildingName.CIB)],
      [Env.DEV, getBuildingForDevEnv(BuildingName.CIB)],
      [Env.LOCAL, getBuildingForDevEnv(BuildingName.CIB)],
    ]);

    const BUILDING = forceGetFromMap(BUILDINGS, getCurrentEnv());

    const userPreferencesCurrency = Currencies.AED;
    const billingCurrency = Currencies.USD;

    test('users are forced to use billing currency across whenever they want to define anything related to billing and see user preferred currency in other parts of Abound', async ({
      globalAdminPage,
      withKnownIssues,
    }) => {
      await withKnownIssues(issues).run(async () => {
        allure.description(`
    There are two places in Abound where user can set currency:
    - Building View -> Settings -> Profile (currency user wants to use when reading information)
    - Building View -> Settings -> Energy Management (billing currency that needs to be used when putting information)

    The first place allows to configure Abound to display values in given currency. Billing currency on the other side
    is used when adding utility readings or when defining budget.
    `);

        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-13424', 'ABOUND-13424');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-13326', 'ABOUND-13326');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-13235', 'ABOUND-13235');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-13607', 'ABOUND-13607');

        let settingsPage: SettingsPage = await openBuildingView(globalAdminPage, {
          buildingName: BUILDING.name,
          featureFlags: {
            globalCurrencySelectionAvailable: true,
          },
        }).then((_) => _.buildingViewSideMenu.openSettingsPage());

        settingsPage = await step(`set currency in user preferences to ${userPreferencesCurrency}`, async () => {
          return settingsPage.settingsSideMenu.openUserProfilePage().then((_) => _.setUserCurrency(Currencies.AED));
        });

        settingsPage = await step(`set billing currency to ${billingCurrency}`, async () => {
          return settingsPage.settingsSideMenu
            .openEnergyManagementPage()
            .then((_) => _.energyManagementPageTabs.clickSpendAndSpendIntensityTab())
            .then((_) => _.setCurrency(billingCurrency));
        });

        let utilityMetersPage = await step(
          `ensure that utility meters table on utility meter modal window shows readings in billing currency ${billingCurrency}`,
          async () => {
            const utilityMetersPage = await settingsPage.settingsSideMenu.openUtilityMetersPage();
            const meter = (await utilityMetersPage.getVisibleMeters(5)).find((meter) => meter.spend !== null);

            if (meter) {
              expect(meter?.spend?.currency).toEqual(billingCurrency);

              const utilityMeterModal = await utilityMetersPage.openMeterModal(meter.meterName);
              const content = await utilityMeterModal.table.getContent(1);
              expect(content[0].totalSpend.currency).toEqual(billingCurrency);

              return utilityMeterModal.close();
            }

            return utilityMetersPage;
          },
        );

        utilityMetersPage = await step(
          `ensure that table on utility meters details page shows readings in billing currency ${billingCurrency}`,
          async () => {
            const utilityMeter = await utilityMetersPage
              .getVisibleMeters(10)
              .then((_) => _.find((_) => _.meterName.length > 0));

            if (utilityMeter) {
              const utilityMeterInformationPage = await utilityMetersPage.openManualMeterDetailsPage(
                utilityMeter.meterNo,
              );
              expect(await utilityMeterInformationPage.table.getHeaders()).toEqual([
                'Billing Period',
                `Total Consumption(${utilityMeter.unit})`,
                `Total Spend(${billingCurrency})`,
                'Comments',
                '', // delete icon
              ]);

              return utilityMeterInformationPage.goBackToUtilityMetersPage();
            }

            return utilityMetersPage;
          },
        );

        settingsPage = await step(
          `ensure Add New Meter page allows to add meters with ${billingCurrency}`,
          async () => {
            const createOrEditUtilityMeterPage = await utilityMetersPage.openAddNewMeterPage();
            expect(await createOrEditUtilityMeterPage.getBillingCurrency()).toEqual(billingCurrency);

            return createOrEditUtilityMeterPage;
          },
        );

        await step(
          `ensure that information on energy page is displayed according to user profile currency (${userPreferencesCurrency})`,
          async () => {
            const energySpendPage = await settingsPage.buildingViewSideMenu
              .openEnergyPage()
              .then((_) => _.openSpendMode());

            const totalSpend = await energySpendPage.getTotalSpend();
            const totalSpendByUtility = await energySpendPage.getTotalSpendByUtility();

            expect(totalSpend.currency).toEqual(userPreferencesCurrency);

            expect(totalSpendByUtility.electricity.spend.currency).toEqual(userPreferencesCurrency);
            expect(totalSpendByUtility.gas.spend.currency).toEqual(userPreferencesCurrency);
            expect(totalSpendByUtility.steam.spend.currency).toEqual(userPreferencesCurrency);
            expect(totalSpendByUtility.water.spend.currency).toEqual(userPreferencesCurrency);
          },
        );
      });
    });
  },
);
