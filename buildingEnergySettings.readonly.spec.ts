import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';

import { test } from '@/tests/playwright/framework/TestConfig';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

test.describe(
  'getbuildingEnergySettings',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.DEV, BuildingName.CIB],
      [Env.QA, BuildingName.CIB],
      [Env.PRE_PROD, BuildingName.CIB],
      [Env.PROD, BuildingName.CAR_CIB],
    ]);

    const building = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv()));
    const customerId = getCustomerForEnv(building.site.customerName).id;

    test('successful fetch', async ({ gqlRunnerByGlobalAdmin }) => {
      const query = `

  query buildingEnergySettings($buildingId: String!) {
    buildingEnergySettings(buildingId: $buildingId) {
      currencyCode
      defaultEmissionFactor {
        value
        zipCode
      }
      emissionFactors {
        spaceId
        type
        value
        unit
      }
      defaultUtilitiesSpendRatesByCurrency {
        steam {
          currencyCode
          rate
          unit
        }
        electricity {
          currencyCode
          rate
          unit
        }
        water {
          currencyCode
          rate
          unit
        }
        gas {
          currencyCode
          rate
          unit
        }
      }
      customUtilitiesSpendRatesByCurrency {
        steam {
          currencyCode
          rate
          unit
        }
        electricity {
          currencyCode
          rate
          unit
        }
        water {
          currencyCode
          rate
          unit
        }
        gas {
          currencyCode
          rate
          unit
        }
      }
    }
  }
`;
      const variables = {
        buildingId: `${building.id}`,
      };

      allure.description('```' + query);
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16635', 'test case: ABOUND-16635');
      await gqlRunnerByGlobalAdmin.runTestStep(
        { query, variables, customerContext: { customerId } },
        async (apiResponse: APIResponse) => {
          const response = await apiResponse.json();
          expect(response).toHaveProperty('data');
          expect(response.data).toHaveProperty('buildingEnergySettings');

          const buildingEnergySettings = response.data.buildingEnergySettings;

          expect(buildingEnergySettings).toHaveProperty('currencyCode');

          if (buildingEnergySettings.defaultEmissionFactor !== null) {
            expect(buildingEnergySettings.defaultEmissionFactor).toHaveProperty('value');
            expect(buildingEnergySettings.defaultEmissionFactor).toHaveProperty('zipCode');
          }

          const emissionFactor = response.data.buildingEnergySettings.emissionFactors;

          if (emissionFactor.length > 0) {
            expect(emissionFactor[0].type).toBeDefined();
            expect(emissionFactor[0].value).toBeDefined();
            expect(emissionFactor[0].unit).toBeDefined();
          }

          const defaultUtilitiesSpendRates = buildingEnergySettings.defaultUtilitiesSpendRatesByCurrency;

          function validateDefaultSpendRates(utilitiesPath: unknown) {
            expect(utilitiesPath).toHaveProperty('currencyCode');
            expect(utilitiesPath).toHaveProperty('rate');
            expect(utilitiesPath).toHaveProperty('unit');
          }

          validateDefaultSpendRates(defaultUtilitiesSpendRates.steam);
          validateDefaultSpendRates(defaultUtilitiesSpendRates.electricity);
          validateDefaultSpendRates(defaultUtilitiesSpendRates.water);
          validateDefaultSpendRates(defaultUtilitiesSpendRates.gas);

          const customUtilitiesSpendRates = buildingEnergySettings.customUtilitiesSpendRatesByCurrency;

          expect(customUtilitiesSpendRates.steam).toBeDefined();
          expect(customUtilitiesSpendRates.electricity).toBeDefined();
          expect(customUtilitiesSpendRates.water).toBeDefined();
          expect(customUtilitiesSpendRates.gas).toBeDefined();
        },
      );
    });
  },
);