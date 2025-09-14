import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import { GetNodeByIdResponse } from '@/tests/playwright/framework/types/getNodeById';

test.describe(
  'getNodeById',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const DEVICES = new Map<Env, { metricName: string; deviceId: string }>([
      [Env.LOCAL, { deviceId: 'ba253ef5-c6f9-4210-bd6b-49b0da4b6c65', metricName: 'Zone Air CO2 Sensor' }],
      [Env.DEV, { deviceId: 'ba253ef5-c6f9-4210-bd6b-49b0da4b6c65', metricName: 'Zone Air CO2 Sensor' }],
      [Env.QA, { deviceId: 'a61f0d4f-f810-4217-849c-cbeaa097650e', metricName: 'Zone Air CO2 Sensor' }],
      [Env.PRE_PROD, { deviceId: 'aa91fac0-027c-44a7-8e60-0e46870177b3', metricName: 'Zone Air Temperature Sensor' }],
      [Env.PROD, { deviceId: 'f6898b5e-e888-4311-8a4e-d6dde52faae2', metricName: 'Zone Air Temperature Sensor' }],
    ]);

    const { deviceId, metricName } = forceGetFromMap(DEVICES, getCurrentEnv());

    const query = `
            query assetHistoryByMetrics(
              $assetNodeId: String!
              $fromDateTime: String!
              $toDateTime: String!
              $metricNames: [String!]
            ) {
              getNodeById(id: $assetNodeId) {
                id
                name
                history(
                  criteria: {
                    fromDateTime: $fromDateTime
                    endDateTime: $toDateTime
                    metricNames: $metricNames
                  }
                ) {
                  points {
                    type
                    value
                    timestamp
                  }
                }
              }
            }`;

    const variables = {
      assetNodeId: deviceId,
      fromDateTime: '2023-09-12T00:00:00.000Z',
      toDateTime: '2023-09-13T00:00:00.000Z',
      metricNames: [metricName],
    };

    test('it is possible to use the query to retrieve the metric historical data for the device', async ({
      gqlRunnerByGlobalAdmin,
    }) => {
      allure.description('```' + query);
      await gqlRunnerByGlobalAdmin.runTestStep({ query, variables }, async (apiResponse: APIResponse) => {
        const response: GetNodeByIdResponse = await apiResponse.json();
        const historyPoints = response.data.getNodeById.history.points;

        expect(historyPoints.length).toBeGreaterThan(0);

        historyPoints.forEach((historyPoint) => {
          expect(historyPoint.type).toEqual(metricName);
          expect(Number(historyPoint.value)).not.toBeNaN();
          expect(historyPoint.timestamp).toBeGreaterThan(0);
        });
      });
    });
  },
);