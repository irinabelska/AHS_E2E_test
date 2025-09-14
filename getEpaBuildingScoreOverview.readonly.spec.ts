import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe(
  'getEpaBuildingScoreOverview',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.LOCAL, BuildingName.CIB],
      [Env.DEV, BuildingName.CIB],
      [Env.QA, BuildingName.CIB],
      [Env.PRE_PROD, BuildingName.CIB],
      [Env.PROD, BuildingName.CAR_CIB],
    ]);

    const BUILDING_ID = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv())).id;
    test('successful fetch', async ({ gqlRunnerByGlobalAdmin }) => {
      const query = `
    query getEpaBuildingScoreOverview($buildingId: ID!) {
        epaBuildingScoreOverview(buildingId: $buildingId){
          building {
            score
            scoreDifference
          }
          portfolio {
            score
            scoreDifference
          }
          groupBuildingsCount {
            noScores
          }
        }
      }
`;
      const variables = {
        buildingId: `${BUILDING_ID}`,
      };

      allure.description('```' + query);
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16465', 'test case: ABOUND-16465');
      await gqlRunnerByGlobalAdmin.runTestStep({ query, variables }, async (apiResponse: APIResponse) => {
        const response = await apiResponse.json();
        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('epaBuildingScoreOverview');

        const epaBuildingScoreOverview = response.data.epaBuildingScoreOverview;
        expect(epaBuildingScoreOverview.building).toBeInstanceOf(Object);
        expect(epaBuildingScoreOverview.building).toHaveProperty('score');
        expect(epaBuildingScoreOverview.building).toHaveProperty('scoreDifference');
        expect(epaBuildingScoreOverview.portfolio).toHaveProperty('score');
        expect(epaBuildingScoreOverview.portfolio).toHaveProperty('scoreDifference');
        expect(epaBuildingScoreOverview.groupBuildingsCount).toHaveProperty('noScores');
      });
    });
  },
);