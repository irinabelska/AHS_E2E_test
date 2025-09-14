import { allure } from 'allure-playwright';
import { APIResponse, expect } from '@playwright/test';

import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';

test.describe(
  'fetchDeviceCount',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName[]>([
      [Env.LOCAL, [BuildingName.AMC_FIREWHEEL_18, BuildingName.ALC_NY_MAIN]],
      [Env.DEV, [BuildingName.AMC_FIREWHEEL_18, BuildingName.ALC_NY_MAIN]],
      [Env.QA, [BuildingName.CIB, BuildingName.ALC_NY_MAIN]],
      [Env.PRE_PROD, [BuildingName.CIB, BuildingName.NY_NJ_OFFICE]],
      [Env.PROD, [BuildingName.CAR_KENNESAW_OFFICE, BuildingName.ALC_NY_NJ]],
    ]);

    const fetchDeviceCount = `
  query ($buildingIds: [String]) {
    fetchDeviceCount(buildingIds: $buildingIds) {
      count
    }
  }`;

    const variables = {
      buildingIds: forceGetFromMap(BUILDINGS, getCurrentEnv()).map((id) => getBuildingById(id).id),
    };

    const customerId =
      getCurrentEnv() === Env.PROD
        ? getCustomerForEnv(CustomerName.AUTOMATED_LOGIC).id
        : getCustomerForEnv(CustomerName.ALC).id;

    test('fetch metric types for buildings', async ({ gqlRunnerByGlobalAdmin }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-14297');
      allure.description('```' + fetchDeviceCount);
      await gqlRunnerByGlobalAdmin.runTestStep(
        { query: fetchDeviceCount, variables, customerContext: { customerId } },
        async (apiResponse: APIResponse) => {
          const response = await apiResponse.json();
          const deviceCount: number = response.data.fetchDeviceCount.count;

          expect(deviceCount).toBeGreaterThan(0);
        },
      );
    });
  },
);
