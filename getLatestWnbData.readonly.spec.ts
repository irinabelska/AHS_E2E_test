import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import { BuildingName, getBuildingByName } from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

test.describe(
  'getLatestWnbData',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    test('successful fetch', async ({ gqlRunnerByGlobalAdmin }) => {
      const BUILDINGS = new Map<Env, BuildingName>([
        [Env.DEV, BuildingName.CIB],
        [Env.QA, BuildingName.CIB],
        [Env.PRE_PROD, BuildingName.CIB],
        [Env.PROD, BuildingName.CAR_KENNESAW_OFFICE],
      ]);
      const building = getBuildingByName(forceGetFromMap(BUILDINGS, getCurrentEnv()));
      const customerId = getCustomerForEnv(building.site.customerName).id;

      const query = `
query {
  getLatestWnbData(buildingId: "${building.id}", limit: 10, utilityType: "electricity") {
    wnbId
  }
}`;

      allure.description('```' + query);
      await gqlRunnerByGlobalAdmin.runTestStep(
        { query, variables: {}, customerContext: { customerId } },
        async (apiResponse: APIResponse) => {
          const response = await apiResponse.json();
          expect(response).toHaveProperty('data');
          expect(response.data).toHaveProperty('getLatestWnbData');
          expect(response.data.getLatestWnbData).toBeInstanceOf(Array);
        },
      );
    });
  },
);