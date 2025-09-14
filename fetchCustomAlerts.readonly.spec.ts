import { allure } from 'allure-playwright';
import { expect } from '@playwright/test';

import { FetchCustomAlert } from '@/tests/playwright/framework/constants/preferenceUnits';
import { test } from '@/tests/playwright/framework/TestConfig';
import { validateFetchCustomAlert } from '@/tests/playwright/tests/api/abound-alarm-gql/alerts/CustomAlert.type';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';

test.describe(
  'fetchCustomAlerts',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const fetchCustomAlertsQuery = `
  query fetchCustomAlerts($options: FetchCustomAlertsOptions!) {
    fetchCustomAlerts(options: $options) {
      totalCount
      items {
        id
        name
        notes
        description
        criticality
        category
        enabled
        routing {
          type
        }
        trigger {
          type
        }
        createdAt
        createdBy
        updatedAt
        updatedBy
        userPermissions {
          read
          update
          delete
          toggle
          reason
        }
      }
    }
  }
`;

    const variables = {
      options: {
        offset: 0,
        limit: 4,
        orderDirection: 'desc',
        orderBy: 'updatedAt',
      },
    };

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

    test('verify fetchCustomAlerts query required fields contract with customer Id', async ({
      withKnownIssues,
      gqlRunnerByGlobalAdmin,
    }) => {
      const customer =
        getCurrentEnv() === Env.PROD
          ? getCustomerForEnv(CustomerName.AUTOMATED_LOGIC)
          : getCustomerForEnv(CustomerName.ALC);
      await withKnownIssues(knownIssues).run(async () => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-14297');
        allure.description('```' + fetchCustomAlertsQuery);
        const response = await gqlRunnerByGlobalAdmin.runQuery({
          query: fetchCustomAlertsQuery,
          variables: variables,
          customerContext: { customerId: customer.id },
        });
        const fetchCustomAlertsResponse = await response.json();
        const allAlerts: FetchCustomAlert[] = fetchCustomAlertsResponse.data.fetchCustomAlerts.items;

        if (allAlerts.length === 0) {
          throw new Error('Fetch custom alerts return zero alerts');
        }

        expect(allAlerts.length).toBeLessThanOrEqual(variables.options.limit);
        expect(typeof fetchCustomAlertsResponse.data.fetchCustomAlerts.totalCount).toEqual('number');
        allAlerts.forEach((alert) => {
          validateFetchCustomAlert(alert);
        });
      });
    });
  },
);