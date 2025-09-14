import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { faker } from '@faker-js/faker';

import { findOrThrow } from '@/tests/playwright/framework/utils/array.utils';
import { getAdminGqlGatewayUrl, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { GqlTestRunner } from '@/tests/playwright/framework/api/GqlTestRunner';
import { ApiErrorResponse } from '@/tests/playwright/framework/api/ApiErrorResponse';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe(
  'customer dashboard api',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const GQL_OPTS = { url: getAdminGqlGatewayUrl(getCurrentEnv()) };
    const testDashboardId = faker.string.uuid();

    const customerQuery = `
query {
  customers(assigned: true) {
    id
    dashboardId
  }
}`;

    function setDashboardIdQuery(customerId: string, dashboardId: string | null): string {
      const sanitizeDashboardId = (id: string | null): string | null => {
        return id ? `"${id}"` : null;
      };

      return `
mutation {
  assignCustomDashboardToCustomer(
      customerId: "${customerId}",
      dashboardId: ${sanitizeDashboardId(dashboardId)}) {
    success
  }
}`;
    }

    interface Customer {
      id: string;
      dashboardId: string;
    }

    async function getCustomer(gqlRunner: GqlTestRunner) {
      return (
        await gqlRunner.runTestStep(
          { query: customerQuery },
          async (apiResponse: APIResponse): Promise<Customer[]> => {
            const response = await apiResponse.json();
            const customers = response.data.customers as Customer[];

            customers.forEach((customer) => {
              expect(customer.id).not.toBeNull();
            });

            return customers;
          },
          { ...GQL_OPTS, stepTitle: 'get-customers' },
        )
      )[0];
    }

    async function assignDashboardIdToCustomer(
      gqlRunner: GqlTestRunner,
      customer: Customer,
      dashboardId: string | null,
    ) {
      await gqlRunner.runTestStep(
        { query: setDashboardIdQuery(customer.id, dashboardId) },
        async (apiResponse: APIResponse) => {
          const response = await apiResponse.json();
          const success = response.data.assignCustomDashboardToCustomer.success as boolean;

          expect(success).toBe(true);
        },
        { ...GQL_OPTS, stepTitle: `set-dashboard-id-${dashboardId}` },
      );
    }

    test('get dashboard id for default customer', async ({ gqlRunnerByGlobalAdmin }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16156', 'ABOUND-16156');
      const query = `
 query {
  getUserCustomDashboardId {
    dashboardId
  }
}`;
      await gqlRunnerByGlobalAdmin.runTestStep({ query }, async (apiResponse: APIResponse) => {
        const response = await apiResponse.json();
        const dashboardId = response.data.getUserCustomDashboardId.dashboardId;

        expect(dashboardId).toBeDefined();
        expect(apiResponse.status()).toBe(200);
      });
    });

    test('admin user should be allowed to set customer dashboard', async ({ gqlRunnerByGlobalAdmin }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16072', 'ABOUND-16072');
      allure.description('```' + customerQuery);
      const customer = await getCustomer(gqlRunnerByGlobalAdmin);
      await assignDashboardIdToCustomer(gqlRunnerByGlobalAdmin, customer, testDashboardId);

      allure.description('```' + customerQuery);
      await gqlRunnerByGlobalAdmin.runTestStep(
        { query: customerQuery },
        async (apiResponse: APIResponse) => {
          const response = await apiResponse.json();
          const customers = response.data.customers as Customer[];
          const customerWithDashboardId = findOrThrow(customers, (_) => _.id === customer.id);

          expect(customerWithDashboardId.dashboardId).toBe(testDashboardId);
        },
        { ...GQL_OPTS, stepTitle: 'get-customers-after-set-dashboard-id' },
      );

      await assignDashboardIdToCustomer(gqlRunnerByGlobalAdmin, customer, testDashboardId);
    });

    test('member user should not be allowed to set customer dashboard', async ({ gqlRunnerByMember }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16072', 'ABOUND-16072');
      const customer = await getCustomer(gqlRunnerByMember);
      const setDashboardQuery = setDashboardIdQuery(customer.id, faker.string.uuid());

      allure.description('```' + setDashboardQuery);
      await gqlRunnerByMember.runTestStep(
        { query: setDashboardQuery },
        async (apiResponse: APIResponse) => {
          const response = await apiResponse.json();
          const error = (response as ApiErrorResponse).errors[0];

          expect(error.message).toBe('Current user does not have enough permissions.');
          expect(Number(error.extensions.code)).toBe(403);
        },
        { ...GQL_OPTS, stepTitle: 'set-dashboard' },
      );
    });
  },
);