import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { Currencies } from '@/tests/playwright/framework/entities/Currencies';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { test } from '@/tests/playwright/framework/TestConfig';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';

test.describe(
  'updateBuildingBillingCurrency',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const buildingAboundId = getBuildingById(BuildingName.CIB).id;

    test('successful update of billing currency', async ({ gqlRunnerByGlobalAdmin }) => {
      const query = `mutation updateBuildingBillingCurrency(
  $payload: UpdateBuildingBillingCurrencyPayload!
) {
  updateBuildingBillingCurrency(payload: $payload) {
    buildingId
    currencyCode
  }
}`;

      const variables = {
        payload: {
          buildingId: `${buildingAboundId}`,
          currencyCode: `${Currencies.USD}`,
        },
      };

      const customerId = getCustomerForEnv(CustomerName.ALC).id;

      allure.description('```' + query);
      await gqlRunnerByGlobalAdmin.runTestStep(
        { query, variables, customerContext: { customerId } },
        async (apiResponse: APIResponse) => {
          const response = await apiResponse.json();
          expect(response).toHaveProperty('data');
          expect(response.data).toHaveProperty('updateBuildingBillingCurrency');
          expect(response.data.updateBuildingBillingCurrency.buildingId).toEqual(`${buildingAboundId}`);
          expect(response.data.updateBuildingBillingCurrency.currencyCode).toEqual(`${Currencies.USD}`);
        },
      );
    });

    test('unsupported currency code', async ({ gqlRunnerByGlobalAdmin }) => {
      const query = `mutation updateBuildingBillingCurrency(
  $payload: UpdateBuildingBillingCurrencyPayload!
) {
  updateBuildingBillingCurrency(payload: $payload) {
    buildingId
    currencyCode
  }
}`;

      const variables = {
        payload: {
          buildingId: `${buildingAboundId}`,
          currencyCode: 'BYN',
        },
      };

      allure.description('```' + query);
      await gqlRunnerByGlobalAdmin.runTestStep({ query, variables }, async (apiResponse: APIResponse) => {
        const response = await apiResponse.json();
        expect(response).toHaveProperty('errors');
        expect(response.errors).toBeInstanceOf(Array);
        expect(response.errors[0].message).toEqual('Currency with code=BYN is not supported in the system');
        expect(response.errors[0].extensions.code).toEqual('BAD_USER_INPUT');

        response.errors.forEach((item: unknown) => {
          expect(item).toHaveProperty('message');
          expect(item).toHaveProperty('extensions');
        });
      });
    });
  },
);
