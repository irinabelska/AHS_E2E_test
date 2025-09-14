import { allure } from 'allure-playwright';
import { APIResponse, expect } from '@playwright/test';

import { MetricType } from '@/tests/playwright/framework/constants/preferenceUnits';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { getMetricType } from '@/tests/playwright/framework/utils/enumToType.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';

test.describe(
  'fetchMetricTypes',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName[]>([
      [Env.LOCAL, [BuildingName.AMC_FIREWHEEL_18, BuildingName.ALC_NY_MAIN]],
      [Env.DEV, [BuildingName.AMC_FIREWHEEL_18, BuildingName.ALC_NY_MAIN]],
      [Env.QA, [BuildingName.CIB, BuildingName.ALC_NY_MAIN]],
      [Env.PRE_PROD, [BuildingName.CIB, BuildingName.NY_NJ_OFFICE]],
      [Env.PROD, [BuildingName.CAR_KENNESAW_OFFICE, BuildingName.ALC_NY_NJ]],
    ]);

    const fetchMetricTypes = `
query fetchMetricTypes($options: fetchMetricTypesOptions!) {
  fetchMetricTypes(options: $options)
}`;

    const variables = {
      options: {
        buildingIds: forceGetFromMap(BUILDINGS, getCurrentEnv()).map((id) => getBuildingById(id).id),
      },
    };

    const customerId =
      getCurrentEnv() === Env.PROD
        ? getCustomerForEnv(CustomerName.AUTOMATED_LOGIC).id
        : getCustomerForEnv(CustomerName.ALC).id;

    test('fetch metric types for buildings', async ({ gqlRunnerByGlobalAdmin }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-14297');
      allure.description('```' + fetchMetricTypes);
      await gqlRunnerByGlobalAdmin.runTestStep(
        { query: fetchMetricTypes, variables, customerContext: { customerId } },
        async (apiResponse: APIResponse) => {
          const fetchCustomAlertResponse = await apiResponse.json();
          const metricTypes: MetricType[] = fetchCustomAlertResponse.data.fetchMetricTypes.map((type: string) =>
            getMetricType(type),
          );

          expect(metricTypes.length).toBeGreaterThan(0);
        },
      );
    });
  },
);