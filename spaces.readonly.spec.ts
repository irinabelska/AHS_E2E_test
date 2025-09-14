import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe('spaces query', () => {
  const BUILDINGS = new Map<Env, BuildingName>([
    [Env.DEV, BuildingName.CIB],
    [Env.QA, BuildingName.CIB],
    [Env.PRE_PROD, BuildingName.CIB],
    [Env.PROD, BuildingName.CAR_CIB],
  ]);

  test('fetchSpacesByBuildingId should be called successfully', async ({ gqlRunnerByGlobalAdmin }) => {
    const buildingId = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv())).id;
    const query = `
  query FetchSpacesByBuildingId {
    fetchSpacesByBuildingId(
      buildingId: "${buildingId}",
      metricTypes: [
        humidity,
        occupancy,
        well_score,
        temperature,
        CO2,
        radon,
        PM25,
        TVOCs
    ]
    )
    {
      id
      name
      type
      disabled
      points {
        metricType
        name
      }
      children {
        id
        name
        type
        disabled
        points {
          metricType
          name
        }
      }
      devices {
        id
        externalId
        name
        brickClass
        points {
          type
        }
      }
    }
  }
`;
    allure.description('```' + query);
    await gqlRunnerByGlobalAdmin.runTestStep({ query, variables: {} }, async (apiResponse: APIResponse) => {
      const response = (await apiResponse.json()) as { data: { fetchSpacesByBuildingId: Record<string, unknown> } };
      expect(response).toHaveProperty('data');
      expect(response.data).toHaveProperty('fetchSpacesByBuildingId');

      const data = response.data.fetchSpacesByBuildingId;
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('disabled');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('type');
      expect(data).toHaveProperty('points');
      expect(data).toHaveProperty('children');
      expect(data).toHaveProperty('devices');
    });
  });
});
