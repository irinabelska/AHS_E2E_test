import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { BuildingName } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { EmissionFactor, EmissionType } from '@/tests/playwright/framework/types/meters';
import { Currencies } from '@/tests/playwright/framework/entities/Currencies';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';

test.describe(
  'Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Energy Management', () => {
      const BUILDING_IDS = new Map<Env, BuildingName>([
        [Env.DEV, BuildingName.ALC_NY_MAIN],
        [Env.LOCAL, BuildingName.ALC_NY_MAIN],
        [Env.QA, BuildingName.CIB],
        [Env.PRE_PROD, BuildingName.CIB],
      ]);

      const BUILDING_ID = forceGetFromMap(BUILDING_IDS, getCurrentEnv());
      const featureFlags = { energyManagementAvailable: true };

      test('crud for the emission factors', async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8800', 'ABOUND-8800');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8801', 'ABOUND-8801');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8802', 'ABOUND-8802');

        const energyManagementPage = await openBuildingView(globalAdminPage, {
          buildingName: BUILDING_ID,
          featureFlags,
        })
          .then((p) => p.buildingViewSideMenu.openSettingsPage())
          .then((p) => p.settingsSideMenu.openEnergyManagementPage())
          .then((p) => p.energyManagementPageTabs.clickEmissionsAndEmissionIntensityTab());
        const addedEmissionFactor: EmissionFactor[] = [{ spaceId: BUILDING_ID, type: 'Natural Gas', value: 0.001 }];
        const editedEmissionFactor: EmissionFactor[] = [{ spaceId: BUILDING_ID, type: 'Electricity', value: 0.002 }];
        const editedEmissionTypes: EmissionType[] = editedEmissionFactor.map((factor) => factor.type);

        const initialState: EmissionFactor[] = await energyManagementPage.getEmissionFactors(BUILDING_ID);
        const initialEmissionTypes: EmissionType[] = initialState.map((factor) => factor.type);

        await step('remove the initial state emission factor', async () => {
          await energyManagementPage.removeEmissionFactors(initialEmissionTypes);
        });

        await step('add new emission factor for natural gas', async () => {
          await energyManagementPage.addEmissionFactors(addedEmissionFactor);
          expect(await energyManagementPage.getEmissionFactors(BUILDING_ID)).toEqual(addedEmissionFactor);
        });

        await step('change the emission factor type and its numeric value', async () => {
          await energyManagementPage.editEmissionFactors(editedEmissionFactor);
          expect(await energyManagementPage.getEmissionFactors(BUILDING_ID)).toEqual(editedEmissionFactor);
        });

        await step('remove the test data and set the initial values', async () => {
          await energyManagementPage.removeEmissionFactors(editedEmissionTypes);
          await energyManagementPage.addEmissionFactors(initialState);
        });
      });

      test('currency selection mutation test', async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-13182', 'ABOUND-13182');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-13326', 'ABOUND-13326');

        const energyManagementPage = await openBuildingView(globalAdminPage, {
          buildingName: BUILDING_ID,
          featureFlags,
        })
          .then((p) => p.buildingViewSideMenu.openSettingsPage())
          .then((p) => p.settingsSideMenu.openEnergyManagementPage())
          .then((p) => p.energyManagementPageTabs.clickSpendAndSpendIntensityTab());
        test.skip(
          !globalAdminPage.user.featureEnabled('globalCurrencySelectionAvailable'),
          'globalCurrencySelectionAvailable feature flag not enabled',
        );
        const initialStateCurrency = await energyManagementPage.getCurrency();
        const mutationCurrency = Currencies.CAD;

        await step("change the billing currency and verify it's changed", async () => {
          await energyManagementPage.setCurrency(mutationCurrency);
          expect(await energyManagementPage.getCurrency()).toEqual(mutationCurrency);
        });

        await step('set the initial currency value', async () => {
          await energyManagementPage.setCurrency(initialStateCurrency);
          expect(await energyManagementPage.getCurrency()).toEqual(initialStateCurrency);
        });
      });
    });
  },
);