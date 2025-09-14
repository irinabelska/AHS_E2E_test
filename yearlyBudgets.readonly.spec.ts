import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { Currencies } from '@/tests/playwright/framework/entities/Currencies';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe(
  'getYearlyBudgets',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.DEV, BuildingName.CIB],
      [Env.LOCAL, BuildingName.CIB],
      [Env.QA, BuildingName.CIB],
      [Env.PRE_PROD, BuildingName.CIB],
      [Env.PROD, BuildingName.CAR_CIB],
    ]);

    const buildingId = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv())).id;
    const year = 2023;
    const currencyCode = Currencies.USD;

    test('smoke test', async ({ gqlRunnerByGlobalAdmin }) => {
      const getYearlyBudgetQuery = {
        query: `query ($listYears: GetYearsInput!) {
  getYearlyBudgets(listYears: $listYears) {
    buildingId
    currencyCode
    yearlyBudgets {
      year
      yearlyBudget
    }
  }
}`,
        variables: {
          listYears: {
            buildingId,
            currencyCode,
            years: year,
          },
        },
      };

      allure.description('```' + getYearlyBudgetQuery);
      await gqlRunnerByGlobalAdmin.runTestStep(getYearlyBudgetQuery, async (apiResponse: APIResponse) => {
        const response = await apiResponse.json();

        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('getYearlyBudgets');

        const budgets = response.data.getYearlyBudgets;

        if (!budgets) {
          test.skip(true, 'no budget defined');
        }

        expect(budgets.buildingId).toEqual(buildingId);
        expect(budgets.currencyCode).toEqual(currencyCode);
        expect(budgets.yearlyBudgets).toBeInstanceOf(Array);
        expect(budgets.yearlyBudgets[0].year).toEqual(year);
        expect(budgets.yearlyBudgets[0].yearlyBudget).toBeGreaterThan(0);
      });
    });
  },
);