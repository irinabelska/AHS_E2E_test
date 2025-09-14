import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { test } from '@/tests/playwright/framework/TestConfig';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';
import { MetersData, EmissionItem } from '@/framework/constants/preferenceUnits';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';

test.describe(
  'fetchPortfolioEnergyData',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const httpHeaders = {
      'user-unit-conversion-enabled': 'true',
      'user-unit-preferences': JSON.stringify({
        temperatureUnit: 'Fahrenheit',
        distanceUnit: 'Feet',
        areaUnit: 'Feet_Squared',
        energyUnit: 'KBTU',
        waterUnit: 'US_GALLON',
        gasUnit: 'THERM',
        steamUnit: 'KBTU',
      }),
    };

    const query = `query fetchPortfolioEnergyData($options: FetchPortfolioEnergyDataArgs!) {
  fetchPortfolioEnergyData(options: $options) {
    buildingId
    siteId
    buildingName
    emissionsData {
      electricity {
        value
        valuePerSqft
      }
      gas {
        value
        valuePerSqft
      }
      period {
        from
        to
      }
      totalEmission
      totalEmissionPerSqft
    }
    metersData {
      billingPeriod {
        from
        to
      }
      electricity {
        type
        unit
        energyUnit
        consumption
        spend
        costPerUnitOfConsumption
        energyConsumption
        energyUseIntensity
        rawEnergyUseIntensity
        spendIntensity
      }
      gas {
        type
        unit
        energyUnit
        consumption
        spend
        costPerUnitOfConsumption
        energyConsumption
        energyUseIntensity
        rawEnergyUseIntensity
        spendIntensity
      }
      steam {
        type
        unit
        energyUnit
        consumption
        spend
        costPerUnitOfConsumption
        energyConsumption
        energyUseIntensity
        rawEnergyUseIntensity
        spendIntensity
      }
      water {
        type
        unit
        energyUnit
        consumption
        spend
        costPerUnitOfConsumption
        energyConsumption
        energyUseIntensity
        rawEnergyUseIntensity
        spendIntensity
      }
      totalEnergyConsumption
      totalSpend
      totalEnergyUseIntensity
      totalSpendIntensity
      areaUnit
      energyUnit
      currencyCode
    }
  }
}`;

    const knownIssues: KnownIssue[] = [
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-16392',
        expectedException(Error, '.*value must not be null nor undefined.*'),
      ),
    ];

    test('successful data fetch and currency code validation for every utility', async ({
      gqlRunnerByGlobalAdmin,
      withKnownIssues,
    }) => {
      const currentYear = new Date(Date.now()).getFullYear();

      const variables = {
        options: {
          years: [currentYear],
          currencyCode: 'USD',
          offset: 0,
          limit: 20,
        },
      };

      allure.description('```' + query);

      const customer =
        getCurrentEnv() === Env.PROD
          ? getCustomerForEnv(CustomerName.AUTOMATED_LOGIC)
          : getCustomerForEnv(CustomerName.ALC);
      await withKnownIssues(knownIssues).run(async () => {
        await gqlRunnerByGlobalAdmin.runTestStep(
          { query, variables, httpHeaders, customerContext: { customerId: customer.id } },
          async (apiResponse: APIResponse) => {
            const response = await apiResponse.json();

            expect(response).toHaveProperty('data');
            expect(response.data).toHaveProperty('fetchPortfolioEnergyData');
            expect(response.data.fetchPortfolioEnergyData).toBeInstanceOf(Array);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.data.fetchPortfolioEnergyData.forEach((data: any) => {
              expect(data).toHaveProperty('buildingId');
              expect(data).toHaveProperty('siteId');
              expect(data).toHaveProperty('buildingName');
              expect(data).toHaveProperty('metersData');
              expect(data.metersData).toBeInstanceOf(Array);
              expect(data.emissionsData).toBeInstanceOf(Array);

              const metersData = data.metersData as MetersData[];

              if (metersData) {
                metersData.forEach((meterItem) => {
                  expect(meterItem).toHaveProperty('totalEnergyConsumption');
                  expect(meterItem).toHaveProperty('totalSpend');
                  expect(meterItem).toHaveProperty('totalEnergyUseIntensity');
                  expect(meterItem).toHaveProperty('totalSpendIntensity');
                  expect(meterItem).toHaveProperty('areaUnit');
                  expect(meterItem).toHaveProperty('energyUnit');
                });
              }

              const emissionsData = data.emissionsData as EmissionItem[];

              if (emissionsData) {
                emissionsData.forEach((emissionItem) => {
                  expect(emissionItem.electricity).toHaveProperty('value');
                  expect(emissionItem.electricity).toHaveProperty('valuePerSqft');
                  expect(emissionItem.gas).toHaveProperty('value');
                  expect(emissionItem.gas).toHaveProperty('valuePerSqft');
                  expect(emissionItem.period).toHaveProperty('from');
                  expect(emissionItem.period).toHaveProperty('to');
                  expect(emissionItem).toHaveProperty('totalEmission');
                  expect(emissionItem).toHaveProperty('totalEmissionPerSqft');
                });
              }
            });
          },
        );
      });
    });
  },
);