import { allure } from 'allure-playwright';
import { expect } from '@playwright/test';

import { BuildingName } from '@/tests/playwright/framework/entities/Buildings';
import { UtilityProviderDescription } from '@/tests/playwright/framework/pages/buildingview/settings/integrations/UtilityProviderCard';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { AuthorizedPage } from '@/tests/playwright/framework/pages/AuthorizedPage';

test.describe(
  'Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Integrations', () => {
      interface TestConfig {
        buildingWithIntegrations: BuildingName;
        integrationTitle: string;
        buildingWithoutIntegrations: BuildingName;
      }

      const CONFIGS: Map<Env, TestConfig> = new Map<Env, TestConfig>([
        [
          Env.PROD,
          {
            buildingWithIntegrations: BuildingName.CAR_AUTOMATED_LOGIC_FACTORY,
            integrationTitle: 'Automatic Utility Bill Collection',
            buildingWithoutIntegrations: BuildingName.LAKE_FOREST_LEASING_OFFICE,
          },
        ],
        [
          Env.PRE_PROD,
          {
            buildingWithIntegrations: BuildingName.CAR_CIB,
            integrationTitle: 'Automatic Utility Bill Collection',
            buildingWithoutIntegrations: BuildingName.NY_NJ_OFFICE,
          },
        ],
        [
          Env.QA,
          {
            buildingWithIntegrations: BuildingName.PARKING_GARAGE,
            integrationTitle: 'Automatic Utility Bill Collection',
            buildingWithoutIntegrations: BuildingName.NONE,
          },
        ],
        [
          Env.DEV,
          {
            buildingWithIntegrations: BuildingName.AMC_FIREWHEEL_18,
            integrationTitle: 'Automatic Utility Bill Collection',
            buildingWithoutIntegrations: BuildingName.NONE,
          },
        ],
        [
          Env.LOCAL,
          {
            buildingWithIntegrations: BuildingName.AMC_FIREWHEEL_18,
            integrationTitle: 'Automatic Utility Bill Collection',
            buildingWithoutIntegrations: BuildingName.NONE,
          },
        ],
      ]);

      const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

      async function openIntegrationPage(page: AuthorizedPage, buildingId: BuildingName) {
        return openBuildingView(page, { buildingName: buildingId })
          .then((p) => p.buildingViewSideMenu.openSettingsPage())
          .then((p) => p.settingsSideMenu.openIntegrationsPage());
      }

      test('smoke test', async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8062', 'ABOUND-8062');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-11890', 'ABOUND-11890');

        const integrationsPage = await openIntegrationPage(globalAdminPage, CONFIG.buildingWithIntegrations);
        const integrations = integrationsPage.getIntegrations();

        expect(integrations.length).toBeGreaterThan(0);

        const integrationDetailsPage = await integrationsPage.openIntegrationDetails(CONFIG.integrationTitle);
        const integrationDetails: UtilityProviderDescription[] = integrationDetailsPage.getProvidersDetails();

        const providers = integrationDetails.map((it) => it.providerName);
        expect(providers.length).toBeGreaterThan(0);
      });

      test('information message should appear if no integrations are found', async ({ globalAdminPage }) => {
        const integrationsPage = await openIntegrationPage(globalAdminPage, CONFIG.buildingWithoutIntegrations);
        await expect(
          integrationsPage.page.playwrightPage.getByText('Add your first integration below then control it here'),
        ).toBeVisible();
      });
    });
  },
);
