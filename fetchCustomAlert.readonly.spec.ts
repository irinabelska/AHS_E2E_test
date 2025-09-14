import { allure } from 'allure-playwright';
import { APIResponse, expect } from '@playwright/test';

import { CustomAlert } from '@/tests/playwright/framework/types/alert';
import { fetchCustomAlertStep } from '@/tests/playwright/tests/api/abound-alarm-gql/alerts/CustomAlert.steps';
import { test } from '@/tests/playwright/framework/TestConfig';
import { validateCustomAlert } from '@/tests/playwright/tests/api/abound-alarm-gql/alerts/CustomAlert.type';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';

test.describe(
  'fetchCustomAlert',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const fetchCustomAlertQuery = `
  query fetchCustomAlert($customAlertId: String!) {
    fetchCustomAlert(customAlertId: $customAlertId) {
      id
      name
      notes
      description
      criticality
      category
      enabled
      routing {
        type
        targets
      }
      trigger {
        type
        buildingIds
        conditions {
          metricName
          conditionType
          conditionValues
          durationTime
        }
      }
      createdAt
      createdBy
      updatedAt
      updatedBy
    }
  }
`;

    const fetchCustomAlertsQuery = `
query fetchCustomAlerts($options: FetchCustomAlertsOptions!) {
    fetchCustomAlerts(options: $options) {
      totalCount
      items {
        id
        name
        createdBy
      }
    }
  }
`;

    const variables = {
      options: {
        offset: 0,
        limit: 20,
        orderDirection: 'desc',
        orderBy: 'updatedAt',
      },
    };

    const customerId =
      getCurrentEnv() === Env.PROD
        ? getCustomerForEnv(CustomerName.AUTOMATED_LOGIC).id
        : getCustomerForEnv(CustomerName.ALC).id;

    const knownIssues: KnownIssue[] = [
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-17824',
        expectedException(TypeError, '.*Cannot read properties of null.*'),
      ),
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-17824',
        expectedException(TypeError, '.*Cannot read properties of undefined.*'),
      ),
    ];

    test('username is included in fetchCustomAlert query if provided', async ({
      withKnownIssues,
      gqlRunnerByGlobalAdmin,
    }) => {
      await withKnownIssues(knownIssues).run(async () => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-14297');
        const response = await gqlRunnerByGlobalAdmin.runQuery({
          query: fetchCustomAlertsQuery,
          variables: variables,
          customerContext: { customerId },
        });
        const fetchCustomAlertsResponse = await response.json();
        const allAlerts: CustomAlert[] = fetchCustomAlertsResponse.data.fetchCustomAlerts.items;
        const alertCreatedByUser =
          allAlerts.find((alert: { createdBy: string }) => alert.createdBy === gqlRunnerByGlobalAdmin.user.id)?.id ??
          '';

        test.skip(alertCreatedByUser === '', 'No alerts created by QA admin user to test with');

        const customAlert = await fetchCustomAlertStep(gqlRunnerByGlobalAdmin, alertCreatedByUser);
        expect(customAlert.createdByUserName).toEqual(gqlRunnerByGlobalAdmin.user.firstAndLastName());
      });
    });

    test('verify custom alert fetched by Id required fields contract', async ({
      withKnownIssues,
      gqlRunnerByGlobalAdmin,
    }) => {
      await withKnownIssues(knownIssues).run(async () => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-14642');
        const response = await gqlRunnerByGlobalAdmin.runQuery(
          { query: fetchCustomAlertsQuery, variables: variables, customerContext: { customerId } },
          { stepTitle: 'fetch custom alerts' },
        );
        const fetchCustomAlertsResponse = await response.json();

        const alertId = {
          customAlertId: fetchCustomAlertsResponse.data.fetchCustomAlerts.items[0].id,
        };

        await gqlRunnerByGlobalAdmin.runTestStep(
          { query: fetchCustomAlertQuery, variables: alertId },
          async (apiResponse: APIResponse) => {
            const response = await apiResponse.json();
            const customAlert = response.data.fetchCustomAlert;
            validateCustomAlert(customAlert);
          },
          { stepTitle: `fetch custom alert, id=${alertId}` },
        );
      });
    });
  },
);