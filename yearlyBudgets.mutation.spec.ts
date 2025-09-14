import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { Currencies } from '@/tests/playwright/framework/entities/Currencies';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { step, test } from '@/tests/playwright/framework/TestConfig';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';

test.describe(
  'crud on yearly budgets test',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const buildingAboundId = getBuildingById(BuildingName.CIB).id;
    const year = 2023;
    const currencyCode = Currencies.USD;
    const yearlyBudget = 1000;
    const updatedYearlyBudget = yearlyBudget + 1;

    test('perform crud operations on the annual budget', async ({ gqlRunnerByGlobalAdmin }) => {
      await step('remove annual budget', async () => {
        const deleteYearlyBudgetQuery = {
          query: `mutation deleteYearlyBudget($listYears: RemoveYearsInput!) {
  deleteYearlyBudget(listYears: $listYears)
}`,
          variables: {
            listYears: {
              buildingId: buildingAboundId,
              years: [year],
            },
          },
        };

        allure.description('```' + deleteYearlyBudgetQuery);
        await gqlRunnerByGlobalAdmin.runTestStep(
          { query: deleteYearlyBudgetQuery.query, variables: deleteYearlyBudgetQuery.variables },
          async (apiResponse: APIResponse) => {
            const response = await apiResponse.json();

            expect(response).toHaveProperty('data');
            expect(response.data.deleteYearlyBudget).toEqual(true);
          },
        );
      });

      await step('add annual budget', async () => {
        const addBudgetQuery = {
          query: `mutation addYearlyBudget($budget: BudgetInput!) {
  addYearlyBudget(budget: $budget) {
    buildingId
    year
    yearlyBudget
  }
}`,
          variables: {
            budget: {
              buildingId: buildingAboundId,
              year,
              yearlyBudget,
            },
          },
        };

        allure.description('```' + addBudgetQuery);
        await gqlRunnerByGlobalAdmin.runTestStep(
          { query: addBudgetQuery.query, variables: addBudgetQuery.variables },
          async (apiResponse: APIResponse) => {
            const response = await apiResponse.json();

            expect(response).toHaveProperty('data');
            expect(response.data).toHaveProperty('addYearlyBudget');
            expect(response.data.addYearlyBudget.yearlyBudget).toEqual(yearlyBudget);
          },
        );
      });

      await step('get yearly budget', async () => {
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
              buildingId: buildingAboundId,
              currencyCode,
              years: year,
            },
          },
        };

        const customerId = getCustomerForEnv(CustomerName.ALC).id;

        allure.description('```' + getYearlyBudgetQuery);
        await gqlRunnerByGlobalAdmin.runTestStep(
          {
            query: getYearlyBudgetQuery.query,
            variables: getYearlyBudgetQuery.variables,
            customerContext: { customerId },
          },
          async (apiResponse: APIResponse) => {
            const response = await apiResponse.json();

            const budgets = response.data.getYearlyBudgets;

            expect(budgets).toBeDefined();
            expect(budgets.buildingId).toEqual(buildingAboundId);
            expect(budgets.currencyCode).toEqual(currencyCode);
            expect(budgets.yearlyBudgets).toBeInstanceOf(Array);
            expect(budgets.yearlyBudgets[0].year).toEqual(year);
            expect(budgets.yearlyBudgets[0].yearlyBudget).toEqual(yearlyBudget);
          },
        );
      });

      await step('update yearly budget', async () => {
        const updateYearlyBudgetQuery = {
          query: `mutation updateYearlyBudget($budget: BudgetInput!) {
  updateYearlyBudget(budget: $budget) {
    buildingId
    year
    yearlyBudget
  }
}`,
          variables: {
            budget: {
              buildingId: buildingAboundId,
              year,
              yearlyBudget: updatedYearlyBudget,
            },
          },
        };

        allure.description('```' + updateYearlyBudgetQuery);
        await gqlRunnerByGlobalAdmin.runTestStep(
          { query: updateYearlyBudgetQuery.query, variables: updateYearlyBudgetQuery.variables },
          async (apiResponse: APIResponse) => {
            const response = await apiResponse.json();

            expect(response).toHaveProperty('data');
            expect(response.data).toHaveProperty('updateYearlyBudget');
            expect(response.data.updateYearlyBudget.yearlyBudget).toEqual(updatedYearlyBudget);
          },
        );
      });
    });
  },
);
