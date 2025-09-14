import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import { BuildingName } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';

test.describe(
  'Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Energy Management', () => {
      const BUILDINGS_IDS = new Map<Env, BuildingName>([
        [Env.DEV, BuildingName.ALC_NY_MAIN],
        [Env.LOCAL, BuildingName.ALC_NY_MAIN],
        [Env.QA, BuildingName.CIB],
        [Env.PRE_PROD, BuildingName.CIB],
        [Env.PROD, BuildingName.CAR_CIB],
      ]);

      const buildingId = forceGetFromMap(BUILDINGS_IDS, getCurrentEnv());

      test('smoke test: check the main layout, tooltip and links', async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8801', 'ABOUND-8801');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8660', 'ABOUND-8660');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8718', 'ABOUND-8718');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8640', 'ABOUND-8640');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-13182', 'ABOUND-13182');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8579', 'ABOUND-8579');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8580', 'ABOUND-8580');

        const energyManagementPage = await openBuildingView(globalAdminPage, {
          buildingName: buildingId,
          featureFlags: {
            energyManagementAvailable: true,
          },
        })
          .then((p) => p.buildingViewSideMenu.openSettingsPage())
          .then((p) => p.settingsSideMenu.openEnergyManagementPage())
          .then((p) => p.energyManagementPageTabs.clickSpendAndSpendIntensityTab())
          .then((p) => p.energyManagementPageTabs.clickEmissionsAndEmissionIntensityTab());
        expect(energyManagementPage).toBeTruthy();
      });
    });
  },
);