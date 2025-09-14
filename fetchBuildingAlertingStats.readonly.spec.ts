import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import {
  Criticality,
  FetchBuildingAlertingStatsResponseItem,
} from '@/tests/playwright/framework/constants/preferenceUnits';
import { test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';

test.describe(
  'fetchBuildingAlertingStats',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.LOCAL, BuildingName.ALC_NY_MAIN],
      [Env.DEV, BuildingName.ALC_NY_MAIN],
      [Env.QA, BuildingName.ALC_NY_MAIN],
      [Env.PRE_PROD, BuildingName.NY_NJ_OFFICE],
      [Env.PROD, BuildingName.ALC_NY_NJ],
    ]);

    const BUILDING = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv()));

    test('successful fetch', async ({ gqlRunnerByGlobalAdmin }) => {
      const query = `
query {
  fetchBuildingAlertingStats(criticality: [PRIORITY_1, PRIORITY_2], buildingId: "${BUILDING.id}") {
    stats {
      criticality
      customAlertsCount
      latestEventTimestamp
      systemAlertsCount
    }
  }
}`;

      const customerId =
        getCurrentEnv() !== Env.PROD
          ? getCustomerForEnv(CustomerName.ALC).id
          : getCustomerForEnv(CustomerName.AUTOMATED_LOGIC).id;

      allure.description('```' + query);
      await gqlRunnerByGlobalAdmin.runTestStep(
        { query, variables: {}, customerContext: { customerId } },
        async (apiResponse: APIResponse) => {
          const response = await apiResponse.json();
          expect(response).toHaveProperty('data');
          expect(response.data).toHaveProperty('fetchBuildingAlertingStats');
          expect(response.data.fetchBuildingAlertingStats).toHaveProperty('stats');
          expect(response.data.fetchBuildingAlertingStats.stats).toBeInstanceOf(Array);
          response.data.fetchBuildingAlertingStats.stats.forEach((item: FetchBuildingAlertingStatsResponseItem) => {
            expect(item.criticality).toBeOneOfEnum(Criticality);
            expect(item.customAlertsCount).toBeGreaterThanOrEqual(0);
            expect(item.systemAlertsCount).toBeGreaterThanOrEqual(0);
            expect(item.latestEventTimestamp).toBeDefined();
          });
        },
      );
    });
  },
);