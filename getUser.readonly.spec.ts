import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { EpaUser } from '@/tests/playwright/framework/constants/preferenceUnits';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { EpaUserResponse } from '@/tests/playwright/framework/types/epaUser';

test.describe(
  'getUser',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const ACCOUNT_IDS = new Map<Env, string>([
      [Env.DEV, '398bb28e-c999-4136-986f-9738d0c364e5'],
      [Env.QA, 'f35a8dbd-904e-4afe-baab-fd63079aee6d'],
      [Env.PRE_PROD, '6bec33a0-9189-4bf8-a248-bc12cc618195'],
      [Env.PROD, '6f95b9a5-d66d-455c-95b8-54a99af2ed72'],
    ]);

    const issues: KnownIssue[] = [
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-18987',
        expectedException(Error, '.*Cannot read properties of null.*'),
      ),
    ];

    test('successful fetch', async ({ gqlRunnerByGlobalAdmin, withKnownIssues }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-11788', 'test case: ABOUND-11788');

      await withKnownIssues(issues).run(async () => {
        const query = `
              query getUser($accountId: ID!) {
                  epaUser(accountId: $accountId) {
                      accountId,
                      propertiesSummary {
                          associated,
                          ingested,
                      }
                  }
              }`;
        const variables = {
          accountId: forceGetFromMap(ACCOUNT_IDS, getCurrentEnv()),
        };

        allure.description('```' + query);

        await gqlRunnerByGlobalAdmin.runTestStep({ query, variables }, async (apiResponse: APIResponse) => {
          const response: EpaUserResponse = await apiResponse.json();
          const epaUser = response.data.epaUser;

          expect(epaUser.accountId).toBeDefined();
          expect(epaUser.propertiesSummary.associated).toBeGreaterThanOrEqual(0);
          expect(epaUser.propertiesSummary.ingested).toBeGreaterThanOrEqual(0);
          expect(epaUser.propertiesSummary.errors).toBeUndefined();
        });
      });
    });
  },
);