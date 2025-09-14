import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';

test.describe(
  'Admin Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Integration', () => {
      interface TestConfig {
        energyStarAccountUserName: string;
        associatedAboundBuildingName: BuildingName;
        customerName: CustomerName;
      }

      const CONFIGS = new Map<Env, TestConfig>([
        [
          Env.DEV,
          {
            energyStarAccountUserName: 'arturrusak',
            associatedAboundBuildingName: BuildingName.CIB,
            customerName: CustomerName.CARRIER_CIB,
          },
        ],
        [
          Env.LOCAL,
          {
            energyStarAccountUserName: 'TBD',
            associatedAboundBuildingName: BuildingName.UNKNOWN,
            customerName: CustomerName.UNKNOWN,
          },
        ],
        [
          Env.QA,
          {
            energyStarAccountUserName: 'mariya_gromyko',
            associatedAboundBuildingName: BuildingName.CIB,
            customerName: CustomerName.CARRIER,
          },
        ],
        [
          Env.PRE_PROD,
          {
            energyStarAccountUserName: 'mgromykopreprod',
            associatedAboundBuildingName: BuildingName.CIB,
            customerName: CustomerName.CARRIER,
          },
        ],
        [
          Env.PROD,
          {
            energyStarAccountUserName: 'Sachin1234',
            associatedAboundBuildingName: BuildingName.CAR_KENNESAW_OFFICE,
            customerName: CustomerName.CARRIER_CORP,
          },
        ],
      ]);

      const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

      const knownIssues = [
        new KnownIssue(
          'https://carrier-digital.atlassian.net/browse/ABOUND-18258',
          expectedException(Error, '.*account details cards no loaded.*'),
        ),
        new KnownIssue(
          'https://carrier-digital.atlassian.net/browse/ABOUND-19172',
          expectedException(Error, '.*account details cards no loaded.*'),
          'currently the integration setting up is broken',
        ),
      ];

      test('smoke test', async ({ globalAdminPage, withKnownIssues }) => {
        test.skip(getCurrentEnv() === Env.DEV, 'Buildings are not associated with dev Energy Star account');

        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-11125', 'ABOUND-11125');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-11279', 'ABOUND-11279');

        await withKnownIssues(knownIssues).run(async () => {
          const energyStarPropertyDetailsPage = await openPortfolioView(globalAdminPage)
            .then((_) => _.topBar.selectCustomer(CONFIG.customerName))
            .then((_) => _.portfolioViewSideMenu.openPvAdminSettings(_, globalAdminPage))
            .then((_) => _.settingsTabBar.openIntegrations())
            .then((_) =>
              _.openEnergyStarBenchmarking()
                .then((p) => p.clickAccount(CONFIG.energyStarAccountUserName))
                .then((p) => p.clickOnProperty(getBuildingById(CONFIG.associatedAboundBuildingName))),
            );

          expect(energyStarPropertyDetailsPage).toBeTruthy();
        });
      });
    });
  },
);
