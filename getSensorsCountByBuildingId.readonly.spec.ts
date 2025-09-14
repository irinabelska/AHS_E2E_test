import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';

import { test } from '../../framework/TestConfig';
import { BuildingName, getBuildingById } from '../../framework/entities/Buildings';
import { Env, getCurrentEnv } from '../../framework/Env';
import { getCustomerForEnv } from '../../framework/entities/Customer';

test.describe(
  'getSensorsCountByBuildingId',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.LOCAL, BuildingName.ALC_NY_MAIN],
      [Env.DEV, BuildingName.ALC_NY_MAIN],
      [Env.QA, BuildingName.ALC_NY_MAIN],
      [Env.PRE_PROD, BuildingName.CIB],
      [Env.PROD, BuildingName.CAR_CIB],
    ]);

    type SensorsCount = {
      sensorClass: string;
      count: string;
    };

    const query = `
  query ($aboundId: String!) {
    getSensorsCountByBuildingId(aboundId: $aboundId) {
      sensorClass
      count
    }
  }
`;
    const building = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv()));

    const variables = {
      aboundId: building.id,
    };

    const customerId = getCustomerForEnv(building.site.customerName).id;

    test('getSensorsCountByBuildingId', async ({ gqlRunnerByGlobalAdmin }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16749', 'Test case: ABOUND-16749');
      allure.description('```' + query);

      await gqlRunnerByGlobalAdmin.runTestStep(
        { query, variables, customerContext: { customerId } },
        async (apiResponse: APIResponse) => {
          const response = await apiResponse.json();

          const sensorsCount: SensorsCount[] = response.data.getSensorsCountByBuildingId;

          expect(sensorsCount).toBeInstanceOf(Array);
          expect(sensorsCount.length).toBeGreaterThan(0);

          sensorsCount.forEach((sensor) => {
            expect(sensor.sensorClass).not.toBeUndefined();
            expect(sensor.count).not.toBeUndefined();
            expect(parseInt(sensor.count, 10)).toBeGreaterThanOrEqual(0); //count is numeric number
          });
        },
      );
    });
  },
);