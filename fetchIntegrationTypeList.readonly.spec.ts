import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { BuildingName, getBuildingByName } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

test.describe(
  'fetchIntegrationTypeList',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.DEV, BuildingName.CIB],
      [Env.QA, BuildingName.CIB],
      [Env.PRE_PROD, BuildingName.CIB],
      [Env.PROD, BuildingName.CAR_CIB],
    ]);

    type Accounts = {
      synced: number;
      unsynced: number;
    };

    type Row = {
      accounts: Accounts;
    };

    test('successful fetch', async ({ gqlRunnerByGlobalAdmin }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-11789', 'test case: ABOUND-11789');
      const query = `
query fetchIntegrationTypeList($options: FetchIntegrationTypeListOptions! ){
    fetchIntegrationTypeList(options: $options) {
        rows {
            accounts {
                synced,
                unsynced
            }
        }
    }
}`;
      const building = getBuildingByName(forceGetFromMap(BUILDINGS, getCurrentEnv()));
      const variables = {
        options: {
          buildingId: building.id,
          integrationType: 'energystar',
        },
      };

      const customerId = getCustomerForEnv(building.site.customerName).id;

      allure.description('```' + query);
      await gqlRunnerByGlobalAdmin.runTestStep(
        { query, variables, customerContext: { customerId } },
        async (apiResponse: APIResponse) => {
          const response = await apiResponse.json();
          const actualRows: Row[] = response.data.fetchIntegrationTypeList.rows;
          expect(actualRows.length).toBeGreaterThan(0);
          actualRows.forEach((item: Row) => {
            expect(item.accounts.synced).toBeGreaterThanOrEqual(0);
            expect(item.accounts.unsynced).toBeGreaterThanOrEqual(0);
          });
        },
      );
    });
  },
);