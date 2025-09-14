import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe(
  'fetchIntegrationAccountList',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.PRE_PROD, BuildingName.CIB],
      [Env.PROD, BuildingName.CAR_KENNESAW_OFFICE],
    ]);

    type Meters = {
      synced: number;
      unsynced: number;
    };

    type IntegrationProvider = {
      integrationId: string;
      name: string;
    };

    type Row = {
      meters: Meters;
      integrationProvider: IntegrationProvider;
    };

    const query = `
  query FetchIntegrationAccountList($options: FetchIntegrationAccountListOptions!) {
    fetchIntegrationAccountList(options: $options) {
      rows {
        id
        integrationId
        username
        meters {
          synced
          unsynced
        }
        status {
          value
          text
        }
        integrationProvider {
          integrationId
          name
        }
        addedDate
      }
    }
  }`;

    test('fetchIntegrationAccountList', async ({ gqlRunnerByGlobalAdmin }) => {
      test.skip(
        ![Env.PRE_PROD, Env.PROD].includes(getCurrentEnv()),
        'test is intended only for pre-prod and prod envs',
      );

      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16576', 'test case: ABOUND-16576');
      allure.description('```' + query);

      const variables = {
        options: {
          integrationType: 'urjanet',
          buildingId: getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv())).id,
        },
      };

      await gqlRunnerByGlobalAdmin.runTestStep({ query, variables }, async (apiResponse: APIResponse) => {
        const response = await apiResponse.json();
        const testRows: Row[] = response.data.fetchIntegrationAccountList.rows;
        expect(testRows.length).toBeGreaterThan(0);
        testRows.forEach((item: Row) => {
          expect(item.meters.synced).toBeGreaterThanOrEqual(0);
          expect(item.meters.unsynced).toBeGreaterThanOrEqual(0);
          expect(item.integrationProvider.integrationId).toBeTruthy();
          expect(item.integrationProvider.name).toBeTruthy();
        });
      });
    });
  },
);