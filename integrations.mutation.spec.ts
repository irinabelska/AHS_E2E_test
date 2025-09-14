import { allure } from 'allure-playwright';
import { expect } from '@playwright/test';

import { BuildingName, getBuildingByName } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { step, test } from '@/tests/playwright/framework/TestConfig';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { UtilityMetersActions } from '@/tests/playwright/framework/apiActions/UtilityMetersActions';
import { IntegrationActions } from '@/tests/playwright/framework/apiActions/IntegrationActions';

test.describe(
  'Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Integrations', () => {
      interface TestConfig {
        buildingName: BuildingName;
        provider: string;
        utilityMeterId: string;
      }

      const CONFIGS = new Map<Env, TestConfig>([
        [
          Env.PRE_PROD,
          {
            buildingName: BuildingName.CAR_COLLIERVILLE,
            provider: 'Memphis Light, Gas and Water Division (MLGW)',
            utilityMeterId: '440302',
          },
        ],
        [
          Env.QA,
          {
            buildingName: BuildingName.CIB,
            provider: 'Georgia Natural Gas (GNG)',
            utilityMeterId: '3344064',
          },
        ],
        [
          Env.DEV,
          {
            buildingName: BuildingName.AMC_FIREWHEEL_18,
            provider: 'Georgia Natural Gas (GNG)',
            utilityMeterId: '3682932',
          },
        ],
        [
          Env.LOCAL,
          {
            buildingName: BuildingName.AMC_FIREWHEEL_18,
            provider: 'Georgia Natural Gas (GNG)',
            utilityMeterId: '3682932',
          },
        ],
      ]);

      const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());
      const buildingId = getBuildingByName(CONFIG.buildingName).id;

      const INTEGRATION_TITLE = 'Automatic Utility Bill Collection';

      const knownIssues: KnownIssue[] = [
        new KnownIssue(
          'https://carrier-digital.atlassian.net/browse/ABOUND-17824',
          expectedException(Error, ".*waiting for getByTestId.* 'Add Utility Meter'"),
        ),
      ];

      test('settings -> integrations crud operations on integrated utility meters', async ({
        globalAdminPage,
        withKnownIssues,
      }) => {
        const providerName = CONFIG.provider;
        const utilityMeterId = CONFIG.utilityMeterId;
        const building = getBuildingByName(CONFIG.buildingName);

        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8062', 'ABOUND-8062');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8301', 'ABOUND-8301');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8336', 'ABOUND-8336');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8480', 'ABOUND-8480');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8480', 'ABOUND-8481');

        await withKnownIssues(knownIssues).run(async () => {
          if (!(await IntegrationActions.isIntegrationActive(providerName, building.id))) {
            throw new Error(
              `The required integration ${providerName} in not active in building ${building.name} (${building.site.name})`,
            );
          }

          const integrationsPage = await openBuildingView(globalAdminPage, { buildingName: CONFIG.buildingName })
            .then((p) => p.buildingViewSideMenu.openSettingsPage())
            .then((p) => p.settingsSideMenu.openIntegrationsPage());

          await step('get existing integrations', () => {
            const integrations = integrationsPage.getIntegrations();

            expect(integrations.length).toBeGreaterThan(0);
          });

          let utilityProviderDetailsPage = await step(
            `open integration details and edit provider ${providerName}`,
            async () => {
              const integrationDetailsPage = await integrationsPage.openIntegrationDetails(INTEGRATION_TITLE);

              return integrationDetailsPage.editProvider(providerName);
            },
          );

          await step('add utility meter and validate', async () => {
            utilityProviderDetailsPage = await utilityProviderDetailsPage.addUtilityMeter(utilityMeterId);
            const synchronizedMeters = await utilityProviderDetailsPage.getSynchronizedMeters();
            expect(synchronizedMeters.find((it) => it.utilityMeterId === utilityMeterId)).toBeTruthy();
          });

          await step('remove utility meter from integrated meters', async () => {
            utilityProviderDetailsPage = await utilityProviderDetailsPage.removeUtilityMeter(utilityMeterId);
            const synchronizedMetersAfterRemoval = await utilityProviderDetailsPage.getSynchronizedMeters();
            expect(synchronizedMetersAfterRemoval.find((it) => it.utilityMeterId === utilityMeterId)).toBeFalsy();
          });
        });
      });

      test.afterAll('clean up the meter created by the test case', async () => {
        await UtilityMetersActions.removeMeterAddedDuringUrjanetMeterIntegration(
          buildingId,
          CONFIG.provider,
          CONFIG.utilityMeterId,
        );
      });
    });
  },
);