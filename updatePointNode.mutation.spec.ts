import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { faker } from '@faker-js/faker';

import { MutationUpdatePointNodeArgs } from '@/framework/constants/preferenceUnits';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import {
  getSubMeterSensorForEnv,
  SubMeterSensorDescription,
} from '@/tests/playwright/framework/entities/SubMeterSensor';
import { BuildingName } from '@/tests/playwright/framework/entities/Buildings';
import {
  DemandMeterSensorDescription,
  getDemandMeterSensorForEnv,
} from '@/tests/playwright/framework/entities/DemandMeterSensor';

test.describe('updatePointNode mutation', () => {
  const CONFIGS = new Map<Env, DemandMeterSensorDescription | SubMeterSensorDescription>([
    [
      Env.LOCAL,
      getDemandMeterSensorForEnv(Env.LOCAL, {
        sensorId: 'test demand id 4',
        serveSpace: BuildingName.CIB,
      }),
    ],
    [
      Env.DEV,
      getDemandMeterSensorForEnv(Env.DEV, {
        sensorId: 'test demand id 4',
        serveSpace: BuildingName.CIB,
      }),
    ],
    [
      Env.QA,
      getSubMeterSensorForEnv(Env.QA, {
        sensorId: '788c15ef-19c6-4478-8c2b-6ef9c7aca907',
        serveSpace: BuildingName.CIB,
      }),
    ],
    [
      Env.PRE_PROD,
      getSubMeterSensorForEnv(Env.PRE_PROD, {
        sensorId: '788c15ef-19c6-4478-8c2b-6ef9c7aca907',
        serveSpace: BuildingName.CIB,
      }),
    ],
  ]);

  const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

  const updatePointNodeMutation = `
      mutation UpdatePointNode($criteria: GetPointQueryCriteria!, $point: UpdatePointNodeParams!) {
        updatePointNode(criteria: $criteria, point: $point)
          {
            externalId
            brickClass
            name
            displayName
            comment
            description
            physicalLocation
          }
      }
    `;

  const getPointNodeQuery = `
        query GetPointNode($criteria: GetPointQueryCriteria!) {
            getPointNode(criteria: $criteria)
              {
                externalId
                brickClass
                name
                displayName
                comment
                description
                physicalLocation
              }
          }
  `;

  test('updatePointNode should be called successfully', async ({ gqlRunnerByGlobalAdmin }) => {
    const variables: MutationUpdatePointNodeArgs = {
      point: {
        description: faker.lorem.paragraph(),
        comment: faker.lorem.paragraph(),
        displayName: faker.string.uuid(),
        physicalLocation: faker.location.streetAddress(),
      },
      criteria: {
        name: CONFIG.sensorName,
        externalId: CONFIG.id.sensorId,
        brickClass: CONFIG.brickClass,
      },
    };

    allure.description('```' + updatePointNodeMutation + getPointNodeQuery + JSON.stringify(variables, null, 2));

    await gqlRunnerByGlobalAdmin.runQuery({ query: updatePointNodeMutation, variables });

    await gqlRunnerByGlobalAdmin.runTestStep(
      { query: getPointNodeQuery, variables },
      async (apiResponse: APIResponse) => {
        const response = (await apiResponse.json()) as { data: { getPointNode: Record<string, unknown> } };
        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('getPointNode');

        const data = response.data.getPointNode;
        expect(data).toHaveProperty('externalId', variables.criteria.externalId);
        expect(data).toHaveProperty('brickClass', variables.criteria.brickClass);
        expect(data).toHaveProperty('name', variables.criteria.name);
        expect(data).toHaveProperty('displayName', variables.point.displayName);
        expect(data).toHaveProperty('comment', variables.point.comment);
        expect(data).toHaveProperty('description', variables.point.description);
        expect(data).toHaveProperty('physicalLocation', variables.point.physicalLocation);
      },
    );
  });
});