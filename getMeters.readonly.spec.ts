import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import { GetMetersResponse } from '@/tests/playwright/framework/types/getMeters';

test.describe(
  'getMeters',
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
  query GetMeters {
    getMeters(
      options: {
       buildingId: "${getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv())).id}"}) {
          totalMetersCount
          meters {
            accountNumber
            archived
            comment
            consumption
            createdAt
            createdBy
            currencyCode
            lastBilled {
              from
              to
            }
            meterId
            mmId
            name
            physicalLocation
            provider
            servedLocations {
              percentage
              serves {
                id
                name
                type
                grossArea
                primaryUsage
                address {
                  street
                  city
                  state
                  country
                  zip
                }
              }
            }
            spend
            status
            type
            unit
            updatedAt
            utilityUpdatedAt
            inSync
            dataSource
            syncedAutoMeterId
            integrationType
          }
        }
      }
    `;

      allure.description('```' + query);
      await gqlRunnerByGlobalAdmin.runTestStep({ query, variables: {} }, async (apiResponse: APIResponse) => {
        const response: GetMetersResponse = await apiResponse.json();

        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('getMeters'); // Update the property name
        expect(response.data.getMeters.meters).toBeInstanceOf(Array);

        response.data.getMeters.meters.forEach((item: unknown) => {
          expect(item).toHaveProperty('accountNumber');
          expect(item).toHaveProperty('meterId');
          expect(item).toHaveProperty('mmId');
          expect(item).toHaveProperty('name');
          expect(item).toHaveProperty('type');
          expect(item).toHaveProperty('currencyCode');
        });
      });
    });
  },
);