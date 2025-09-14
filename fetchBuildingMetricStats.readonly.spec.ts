import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe(
  'fetchBuildingMetricStats',
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

    type Stat = {
      value: number;
      unit: string;
    };

    type Stats = {
      metricType: [keyof typeof metricTypeToUnit];
      latestEventTimeStamp: string;
      min: Stat;
      max: Stat;
      avg: Stat;
    };

    const metricTypeToUnit: Record<string, string> = {
      TVOCs: 'ppb',
      PM25: 'µg/m3',
      CO2: 'ppm',
      humidity: '%',
      temperature: 'Fahrenheit',
      radon: 'pCi/L',
    };

    test('successful fetch', async ({ gqlRunnerByGlobalAdmin }) => {
      const query = `
query {
  fetchBuildingMetricStats(
    buildingId: "${getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv())).id}"
    metricTypes: [
        humidity,
        CO2,
        temperature,
        PM25,
        TVOCs,
        radon
    ]
    statsPeriod: { fromDate: "2023-04-11T00:00:00.000Z", toDate: "2023-04-12T00:00:00.000Z" }
  ) {
      stats {
          metricType
          latestEventTimestamp
          min {
              value
              unit
          }
          max {
              value
              unit
          }
          avg {
              value
              unit
          }
      }
    }
}`;

      allure.description('```' + query);
      await gqlRunnerByGlobalAdmin.runTestStep({ query, variables: {} }, async (apiResponse: APIResponse) => {
        const response = await apiResponse.json();
        const actualStats: Stats[] = response.data.fetchBuildingMetricStats.stats;
        expect(actualStats.length).toBeGreaterThan(0);
        actualStats.forEach(
          (item: {
            metricType: [keyof typeof metricTypeToUnit];
            latestEventTimeStamp: string;
            min: Stat;
            max: Stat;
            avg: Stat;
          }) => {
            const expectedUnit = metricTypeToUnit[item.metricType as unknown as string];

            expect(item).toHaveProperty('latestEventTimestamp');

            expect(item.min.value).toBeGreaterThanOrEqual(0);
            expect(item.min.unit).toEqual(expectedUnit);

            expect(item.max.value).toBeGreaterThanOrEqual(0);
            expect(item.max.unit).toEqual(expectedUnit);

            expect(item.avg.value).toBeGreaterThanOrEqual(0);
            expect(item.avg.unit).toEqual(expectedUnit);
          },
        );
      });
    });
  },
);