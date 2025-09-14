import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { Currency } from '@/framework/constants/preferenceUnits';
import { Currencies } from '@/tests/playwright/framework/entities/Currencies';
import { test } from '@/tests/playwright/framework/TestConfig';
import { UNITS_ELECTRICITY, UNITS_GAS, UNITS_STEAM, UNITS_WATER } from '@/tests/playwright/framework/types/meters';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { EnergyDictionaryResponse } from '@/tests/playwright/framework/types/energyDictionary';

test.describe(
  'energyDictionary',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    function getExpectedGasUnits() {
      const expectedGasUnits = Object.values(UNITS_GAS).filter(
        (unit) => unit !== 'Btu' && unit !== 'thm' && unit !== 'Cf',
      );
      expectedGasUnits.push('Btus');
      expectedGasUnits.push('cf');
      expectedGasUnits.push('Gallons');

      return expectedGasUnits;
    }

    function getExpectedWaterUnits() {
      const expectedWaterUnits = Object.values(UNITS_WATER).filter(
        (unit) => unit !== 'Cf' && unit !== 'gal' && unit !== 'US gallons (gal)' && unit !== 'Kiloliters (kL)',
      );
      expectedWaterUnits.push('cf');

      return expectedWaterUnits;
    }

    test('successful fetch of energy and currencies dictionary', async ({ gqlRunnerByGlobalAdmin }) => {
      const query = `query EnergyDictionary {
                        energyDictionary {
                          meterUnits {
                            electricity
                            gas
                            sewer
                            steam
                            water
                          }
                          currencies {
                            code
                            label
                          }
                        }
                      }`;

      const customer =
        getCurrentEnv() === Env.PROD
          ? getCustomerForEnv(CustomerName.AUTOMATED_LOGIC)
          : getCustomerForEnv(CustomerName.ALC);
      const customerId = customer.id;
      allure.description('```' + query);

      await gqlRunnerByGlobalAdmin.runTestStep(
        { query, variables: {}, customerContext: { customerId } },
        async (apiResponse: APIResponse) => {
          const response: EnergyDictionaryResponse = await apiResponse.json();

          expect(response).toHaveProperty('data');
          expect(response.data).toHaveProperty('energyDictionary');
          expect(response.data.energyDictionary.meterUnits.electricity).toEqual(Object.keys(UNITS_ELECTRICITY));
          expect(response.data.energyDictionary.meterUnits.gas.sort()).toEqual(getExpectedGasUnits().sort());
          expect(response.data.energyDictionary.meterUnits.sewer.sort()).toEqual(getExpectedWaterUnits().sort());
          expect(response.data.energyDictionary.meterUnits.steam.sort()).toEqual(Object.keys(UNITS_STEAM).sort());
          expect(response.data.energyDictionary.meterUnits.water.sort()).toEqual(getExpectedWaterUnits().sort());

          const expectedCurrencyCodes: string[] = Object.keys(Currencies);
          const actualCurrencyCodes: string[] = response.data.energyDictionary.currencies.map(
            (currency: Currency) => currency.code,
          );

          expect(actualCurrencyCodes).toEqual(expectedCurrencyCodes);
        },
      );
    });
  },
);
