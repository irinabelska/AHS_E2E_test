import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { MetricType } from '@/tests/playwright/framework/constants/preferenceUnits';
import { test } from '@/tests/playwright/framework/TestConfig';
import { Customer, getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';

test.describe(
  'fetchSpacesWithMetrics',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    function textToMetricType(text: string): MetricType {
      switch (text) {
        case 'humidity':
        case 'occupancy':
        case 'well_score':
        case 'temperature':
        case 'CO2':
        case 'radon':
        case 'PM25':
        case 'TVOCs':
          return text as MetricType;
        default:
          throw new Error(`Unknown metric type: ${text}`);
      }
    }

    const query = `
query fetchSpacesWithMetrics($options: FetchSpacesWithMetricsInput!) {
  fetchSpacesWithMetrics(options: $options) {
    id
    brickClass
    name
    supportedMetrics
    children {
      id
      brickClass
      name
      supportedMetrics
      children {
        id
        brickClass
        name
        supportedMetrics
        children {
          id
          brickClass
          name
          supportedMetrics
        }
      }
    }
  }
}`;

    const customers = new Map<Env, Customer>([
      [Env.DEV, Customer.DEV_ALC],
      [Env.LOCAL, Customer.DEV_ALC],
      [Env.QA, Customer.QA_ALC],
      [Env.PRE_PROD, Customer.PREPROD_ALC],
      [Env.PROD, Customer.PROD_LINK_LOGISTICS],
    ]);

    const customerId = getCustomerForEnv(forceGetFromMap(customers, getCurrentEnv()).name).id;

    function getVariables(spaceLevel: 'Building' | 'Floor' | 'Room') {
      return {
        options: {
          spaceLevel,
          metricCategories: ['IAQ', 'Occupancy'],
        },
      };
    }

    interface APIResponse {
      json: () => Promise<{
        data: {
          fetchSpacesWithMetrics: Space[];
        };
      }>;
    }

    interface Space {
      id: string;
      brickClass: string;
      name: string;
      supportedMetrics: string[];
      children: Space[];
    }

    async function getValidSpacesFromResponse(apiResponse: APIResponse) {
      const response = await apiResponse.json();

      expect(response).toHaveProperty('data');
      expect(response.data).toHaveProperty('fetchSpacesWithMetrics');

      const spaces: Space[] = response.data.fetchSpacesWithMetrics;

      spaces.forEach((space) => validateBuilding(space));

      return spaces;
    }

    function validateBuilding(building: Space) {
      const errorMsg = `offending building.id=${building.id}`;
      expect(building).toHaveProperty('id');
      expect(building.brickClass, errorMsg).toEqual('Building');
      expect(building, errorMsg).toHaveProperty('name');
      expect(
        building.supportedMetrics.map((_) => textToMetricType(_)),
        errorMsg,
      ).toEqual(
        expect.arrayContaining(
          building.children.reduce((acc, floor) => {
            floor.supportedMetrics.forEach((_) => acc.push(textToMetricType(_)));

            return acc;
          }, new Array<MetricType>()),
        ),
      );

      building.children.forEach((floor) => validateFloor(floor));
    }

    function validateFloor(floor: Space) {
      const errorMsg = `offending floor.id=${floor.id}`;
      expect(floor).toHaveProperty('id');
      expect(floor.brickClass, errorMsg).toMatch(/^(Floor|Building)$/);
      expect(floor, errorMsg).toHaveProperty('name');
      expect(
        floor.supportedMetrics.map((_) => textToMetricType(_)),
        errorMsg,
      ).toEqual(
        expect.arrayContaining(
          floor.children.reduce((acc, room) => {
            room.supportedMetrics.forEach((_) => acc.push(textToMetricType(_)));

            return acc;
          }, new Array<MetricType>()),
        ),
      );

      floor.children.forEach((room) => validateRoom(room));
    }

    function validateRoom(room: Space) {
      const errorMsg = `offending room.id=${room.id}`;
      expect(room).toHaveProperty('id');
      expect(room.brickClass, errorMsg).toMatch(/^(Floor|Room)$/);
      expect(room, errorMsg).toHaveProperty('name');
      expect(room.supportedMetrics, errorMsg).toBeDefined();
    }

    function spacesToMetricsMapping(spaces: Space[]): Map<string, MetricType[]> {
      return !spaces
        ? new Map<string, MetricType[]>()
        : spaces.reduce((acc, space) => {
            acc.set(
              space.id,
              space.supportedMetrics.map((_) => textToMetricType(_)),
            );
            const childMapping: Map<string, MetricType[]> = spacesToMetricsMapping(space.children);

            return new Map<string, MetricType[]>([...acc, ...childMapping]);
          }, new Map<string, MetricType[]>());
    }

    function validateSpaceToMetricsMapping(spaces: Space[], spaceToMetrics: Map<string, MetricType[]>) {
      const mapping = spacesToMetricsMapping(spaces);

      mapping.forEach((metrics, spaceId) => {
        expect(new Set(spaceToMetrics.get(spaceId))).toEqual(new Set(metrics));
      });
    }

    test('fetch spaces with metrics should return consistent data', async ({ gqlRunnerByGlobalAdmin }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16494', 'ABOUND-16494');
      allure.description('```' + query);

      const spaceToMetrics: Map<string, MetricType[]> = await gqlRunnerByGlobalAdmin.runTestStep(
        {
          query,
          variables: getVariables('Room'),
          customerContext: { customerId },
        },
        async (apiResponse: APIResponse) => {
          const spaces = await getValidSpacesFromResponse(apiResponse);

          return spacesToMetricsMapping(spaces);
        },
        { stepTitle: 'fetch metrics on room level' },
      );

      await gqlRunnerByGlobalAdmin.runTestStep(
        { query, variables: getVariables('Floor') },
        async (apiResponse: APIResponse) => {
          const spaces = await getValidSpacesFromResponse(apiResponse);
          validateSpaceToMetricsMapping(spaces, spaceToMetrics);
        },
        { stepTitle: 'fetch metrics on Floor level' },
      );

      await gqlRunnerByGlobalAdmin.runTestStep(
        { query, variables: getVariables('Building') },
        async (apiResponse: APIResponse) => {
          const spaces = await getValidSpacesFromResponse(apiResponse);
          validateSpaceToMetricsMapping(spaces, spaceToMetrics);
        },
        { stepTitle: 'fetch metrics on Building level' },
      );
    });
  },
);
