import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { GetDemandMetersResponse } from '@/tests/playwright/framework/types/getDemandMeters';

test.describe(
  'getDemandMeters',
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

    test('successful fetch', async ({ gqlRunnerByGlobalAdmin }) => {
      const query = `
      query {
        getNodeById(id: "${getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv())).id}") {
          demandMeters(types: ["electricity", "gas", "water", "steam"]) {
            externalId
            displayName
            type
            unit
            virtual
            instantaneousConsumption(
              options: {
                period: {
                  from: "2023-12-01 00:00:00 +02:00"
                  to: "2023-12-02 00:00:00 +02:00"
                }
                windowSize: 96
              }
            ) {
              unit
              instantaneousData {
                value
                period {
                  from
                  to
                }
              }
              instantaneousAggregations {
                min {
                  value
                }
                max {
                  value
                }
                avg {
                  value
                }
              }
            }
          }
        }
      }
      `;

      allure.description('```' + query);

      await gqlRunnerByGlobalAdmin.runTestStep({ query, variables: {} }, async (apiResponse: APIResponse) => {
        const response: GetDemandMetersResponse = await apiResponse.json();

        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('getNodeById');
        expect(response.data.getNodeById).toHaveProperty('demandMeters');
        expect(response.data.getNodeById.demandMeters).toBeInstanceOf(Array);

        response.data.getNodeById.demandMeters.forEach((item) => {
          expect(item).toHaveProperty('externalId');
          expect(item).toHaveProperty('displayName');
          expect(item).toHaveProperty('type');
          expect(item).toHaveProperty('unit');
          expect(item).toHaveProperty('virtual');
          expect(item).toHaveProperty('instantaneousConsumption');
          expect(item.instantaneousConsumption).toHaveProperty('unit');
          expect(item.instantaneousConsumption).toHaveProperty('instantaneousData');
          expect(item.instantaneousConsumption).toHaveProperty('instantaneousAggregations');
          expect(item.instantaneousConsumption.instantaneousAggregations).toHaveProperty('max');
          expect(item.instantaneousConsumption.instantaneousAggregations).toHaveProperty('min');
          expect(item.instantaneousConsumption.instantaneousAggregations).toHaveProperty('avg');
        });
      });
    });
  },
);
