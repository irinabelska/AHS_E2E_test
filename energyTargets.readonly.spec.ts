import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import { BuildingName } from '@/tests/playwright/framework/entities/Buildings';
import { EnergyTargetsPage } from '@/tests/playwright/framework/pages/buildingview/settings/energytargets/EnergyTargetsPage';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/framework/utils/map.utils';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { AuthorizedPage } from '@/tests/playwright/framework/pages/AuthorizedPage';
import { FeatureFlags } from '@/tests/playwright/framework/launchdarkly/FeatureFlagProvider';

test.describe(
  'Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Energy Targets', () => {
      const BUILDINGS = new Map<Env, BuildingName>([
        [Env.LOCAL, BuildingName.CIB],
        [Env.DEV, BuildingName.CIB],
        [Env.QA, BuildingName.CIB],
        [Env.PRE_PROD, BuildingName.CIB],
        [Env.PROD, BuildingName.CAR_CIB],
      ]);

      const buildingId = forceGetFromMap(BUILDINGS, getCurrentEnv());

      async function openEnergyTargets(page: AuthorizedPage, featureFlags?: FeatureFlags): Promise<EnergyTargetsPage> {
        return openBuildingView(page, {
          buildingName: buildingId,
          featureFlags: {
            energyTargetsAvailable: true,
            ...featureFlags,
          },
        })
          .then((_) => _.buildingViewSideMenu.openSettingsPage())
          .then((_) => _.settingsSideMenu.openEnergyTargetsPage());
      }

      test('consumption: smoke test', async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15772', 'ABOUND-15772');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15773', 'ABOUND-15773');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15839', 'ABOUND-15839');

        const subMetersConsumptionPage = await openEnergyTargets(globalAdminPage)
          .then((p) => p.energyTargetsPageTabs.clickSubMeterTab())
          .then((p) => p.setConsumptionType())
          .then((p) => p.getTargets());

        expect(subMetersConsumptionPage).toBeTruthy();
      });

      test('spend: smoke test', async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16591', 'ABOUND-16591');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16607', 'ABOUND-16607');

        const subMetersSpendPage = await openEnergyTargets(globalAdminPage, { spendEnergyTargetsAvailable: true })
          .then((p) => p.energyTargetsPageTabs.clickSubMeterTab())
          .then((p) => p.setSpendType())
          .then((p) => p.getTargets());

        expect(subMetersSpendPage).toBeTruthy();
      });
    });
  },
);
