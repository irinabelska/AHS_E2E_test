import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { faker } from '@faker-js/faker';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import {
  Building,
  BuildingName,
  getBuildingForDevEnv,
  getBuildingForPreProdEnv,
  getBuildingForQaEnv,
} from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { MeterCreateOrUpdateRequest } from '@/tests/playwright/framework/pages/buildingview/settings/meters/utilitymeters/editPage/ManualUtilityMeterEditPage';
import { ByTextMeterFilter } from '@/tests/playwright/framework/pages/buildingview/settings/meters/MeterFilter';
import { BuildingSelector } from '@/tests/playwright/framework/entities/LocationSelector';
import { Status } from '@/tests/playwright/framework/pages/buildingview/settings/meters/Helpers';
import { UtilityReading } from '@/tests/playwright/framework/pages/buildingview/settings/meters/utilitymeters/UtilityReading';
import { getDayMonthYear, TODAY, WEEK_AGO, YESTERDAY } from '@/tests/playwright/framework/entities/DatePeriod';
import { UtilityMeterDetails } from '@/tests/playwright/framework/pages/buildingview/settings/meters/utilitymeters/detailsPage/UtilityMeterDetailsComponent';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { UtilityMetersActions } from '@/tests/playwright/framework/apiActions/UtilityMetersActions';
import {
  Consumption,
  createUtilityData,
  saveUtilityConsumptionFromChart,
  saveUtilityConsumptionFromTable,
  saveUtilitySpendFromChart,
  saveUtilitySpendFromTable,
  Spend,
  UtilityConsumptionParams,
  UtilityReadingParams,
  UtilitySpendParams,
} from '@/tests/playwright/framework/utils/utility.meters.utils';
import { Currencies } from '@/tests/playwright/framework/entities/Currencies';

test.describe(
  'Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Utility Meters', () => {
      interface UtilityReadingMeters {
        gas: UtilityReading;
        water: UtilityReading;
      }

      const BUILDINGS = new Map<Env, Building>([
        [Env.LOCAL, getBuildingForDevEnv(BuildingName.ALC_NY_MAIN)],
        [Env.DEV, getBuildingForDevEnv(BuildingName.ALC_NY_MAIN)],
        [Env.QA, getBuildingForQaEnv(BuildingName.CIB)],
        [Env.PRE_PROD, getBuildingForPreProdEnv(BuildingName.CIB)],
      ]);

      const BUILDING = forceGetFromMap(BUILDINGS, getCurrentEnv());

      const meterPrefix = {
        electricity: `e2e-electricity-${faker.string.alphanumeric(10)}`,
        water: `e2e-water-${faker.string.alphanumeric(10)}`,
        gas: `e2e-gas-${faker.string.alphanumeric(10)}`,
      };

      const meterRequest: {
        create: {
          electricity: MeterCreateOrUpdateRequest;
          water: MeterCreateOrUpdateRequest;
        };
        update: {
          gas: MeterCreateOrUpdateRequest;
        };
      } = {
        create: {
          electricity: {
            meterNo: meterPrefix.electricity + '-number',
            meterName: meterPrefix.electricity + '-name',
            type: 'electricity',
            unit: 'kWh',
            serves: [new BuildingSelector(BUILDING.name)],
          },
          water: {
            meterNo: meterPrefix.water + '-number',
            meterName: meterPrefix.water + '-name',
            type: 'water',
            unit: 'US gallons (gal)',
            shortUnit: 'gal',
            serves: [new BuildingSelector(BUILDING.name)],
            physicalLocation: BUILDING.name,
          },
        },
        update: {
          gas: {
            meterNo: meterPrefix.gas + '-number-updated',
            meterName: meterPrefix.gas + '-name-updated',
            type: 'gas',
            unit: 'Therms',
            shortUnit: 'thm',
            serves: [new BuildingSelector(BUILDING.name)],
            physicalLocation: BUILDING.name,
          },
        },
      };

      const utilityReading: UtilityReadingMeters = {
        gas: {
          datePeriod: { dateFrom: WEEK_AGO, dateTo: YESTERDAY },
          consumption: faker.number.int({ max: 1000 }),
          spend: faker.number.int({ max: 1000 }),
          comment: 'gas utility reading created by e2e tests',
        },
        water: {
          datePeriod: { dateFrom: WEEK_AGO, dateTo: YESTERDAY },
          consumption: faker.number.int({ max: 1000 }),
          spend: faker.number.int({ max: 1000 }),
          comment: 'water utility reading created by e2e tests',
        },
      };

      const getUtilityReadingDate = (utilityReading: UtilityReading) => {
        return {
          from: getDayMonthYear(utilityReading.datePeriod.dateFrom),
          to: getDayMonthYear(utilityReading.datePeriod.dateTo),
        };
      };

      const gasConsumption: Consumption = createUtilityData<number>(-1);
      const waterConsumption: Consumption = createUtilityData<number>(-1);

      const gasSpend: Spend = createUtilityData<number>(-1);
      const waterSpend: Spend = createUtilityData<number>(-1);

      const defaultCurrency = Currencies.USD;

      test('it should be possible to create/edit/add reading/check reading/archive utility meters', async ({
        globalAdminPage,
      }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6966', 'ABOUND-6966');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9339', 'ABOUND-9339');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-7908', 'ABOUND-7908');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-19864', 'ABOUND-19864');

        test.setTimeout(360_000);

        const createElectricityMeterRequest = meterRequest.create.electricity;
        const updateGasMeterRequest = meterRequest.update.gas;

        const buildingViewSideMenu = await step(
          'save initial "Consumption" & "Spend" values for "Gas" from chart and table',
          async () => {
            const buildingViewSideMenu = (await openBuildingView(globalAdminPage, { buildingName: BUILDING.name }))
              .buildingViewSideMenu;
            const energyPage = await buildingViewSideMenu.openEnergyPage();
            const utilityMetersConsumptionPage = await energyPage.openConsumptionMode();
            await utilityMetersConsumptionPage.selectCurrency(defaultCurrency);

            await utilityMetersConsumptionPage.switchView('Utility units');

            const chartInitialGasConsumption: UtilityConsumptionParams = {
              meterType: 'Gas',
              utilityData: gasConsumption,
              page: utilityMetersConsumptionPage,
              state: 'initial',
            };

            const tableInitialGasConsumption: UtilityConsumptionParams & UtilityReadingParams = {
              utilityReading: utilityReading.gas,
              meterType: 'Gas',
              utilityData: gasConsumption,
              page: utilityMetersConsumptionPage,
              state: 'initial',
            };

            await saveUtilityConsumptionFromChart(chartInitialGasConsumption);
            await saveUtilityConsumptionFromTable(tableInitialGasConsumption);

            const utilityMetersSpendPage = await energyPage.openSpendMode();
            await utilityMetersSpendPage.selectCurrency(defaultCurrency);

            await utilityMetersSpendPage.switchView('Utility units');

            const chartInitialGasSpend: UtilitySpendParams = {
              meterType: 'Gas',
              utilityData: gasSpend,
              page: utilityMetersSpendPage,
              state: 'initial',
            };

            const tableInitialGasSpend: UtilitySpendParams & UtilityReadingParams = {
              meterType: 'Gas',
              utilityReading: utilityReading.gas,
              utilityData: gasSpend,
              page: utilityMetersSpendPage,
              state: 'initial',
            };

            await saveUtilitySpendFromChart(chartInitialGasSpend);
            await saveUtilitySpendFromTable(tableInitialGasSpend);

            return buildingViewSideMenu;
          },
        );

        let utilityMetersPage = await step('open Utility Meters page', async () => {
          return buildingViewSideMenu.openSettingsPage().then((p) => p.settingsSideMenu.openUtilityMetersPage());
        });

        utilityMetersPage = await step(
          `create a meter with meterID=${createElectricityMeterRequest.meterNo}`,
          async () => {
            utilityMetersPage = await utilityMetersPage.createMeter(createElectricityMeterRequest);

            return utilityMetersPage;
          },
        );

        utilityMetersPage = await step(
          `search for the meter with name=${createElectricityMeterRequest.meterName} after the meter creation`,
          async () => {
            utilityMetersPage = await utilityMetersPage.filterMetersWithoutReset([
              ByTextMeterFilter.of(createElectricityMeterRequest.meterName),
            ]);
            const searchResults = await utilityMetersPage.getVisibleMeters();

            expect(searchResults[0].meterName).toEqual(createElectricityMeterRequest.meterName);
            expect(searchResults[0].meterNo).toEqual(createElectricityMeterRequest.meterNo);
            expect(searchResults[0].status).toEqual(Status.inactive);

            return utilityMetersPage;
          },
        );

        utilityMetersPage = await step(
          `update the meter with ID=${createElectricityMeterRequest.meterNo} to ID=${updateGasMeterRequest.meterNo} and verify the update took place`,
          async () => {
            await utilityMetersPage.updateMeter(createElectricityMeterRequest.meterName, updateGasMeterRequest);
            await utilityMetersPage.filterMetersWithoutReset([ByTextMeterFilter.of(updateGasMeterRequest.meterName)]);

            const searchResult = await utilityMetersPage.getVisibleMeters();

            expect(searchResult[0].meterNo).toEqual(updateGasMeterRequest.meterNo);
            expect(searchResult[0].meterName).toEqual(updateGasMeterRequest.meterName);
            expect(searchResult[0].type).toEqual(updateGasMeterRequest.type);
            expect(searchResult[0].unit).toEqual(updateGasMeterRequest.unit);
            expect(searchResult[0].status).toEqual(Status.inactive);

            return utilityMetersPage;
          },
        );

        utilityMetersPage = await step(
          `add utility reading for meter with ID=${updateGasMeterRequest.meterNo}`,
          async () => {
            const utilityMeterDetailsPage = await utilityMetersPage.openManualMeterDetailsPage(
              updateGasMeterRequest.meterName,
            );

            expect(utilityMeterDetailsPage.getMeterInfo()).toEqual(
              UtilityMeterDetails.createFromMeterCreateRequest(
                updateGasMeterRequest,
                globalAdminPage.user.email,
                TODAY,
              ),
            );

            await utilityMeterDetailsPage.addReading(utilityReading.gas);
            await utilityMeterDetailsPage.goBackToUtilityMetersPage();
            await utilityMetersPage.filterMeters([ByTextMeterFilter.of(updateGasMeterRequest.meterName)]);

            const searchResult = await utilityMetersPage.getVisibleMeters();

            expect(searchResult[0].status).toEqual(Status.manual);
            expect(searchResult[0].consumption).toEqual(
              `${utilityReading.gas.consumption.toString()} ${updateGasMeterRequest.shortUnit}`,
            );
            expect(searchResult[0].spend?.value).toEqual(utilityReading.gas.spend);

            return utilityMetersPage;
          },
        );

        const utilityMetersConsumptionPage = await step(
          'Added utility reading values for "Gas" affected "Consumption" values on chart',
          async () => {
            const energyPage = await buildingViewSideMenu.openEnergyPage();
            const utilityMetersConsumptionPage = await energyPage.openConsumptionMode();
            await utilityMetersConsumptionPage.selectCurrency(defaultCurrency);

            await utilityMetersConsumptionPage.switchView('Utility units');

            const chartUpdatedGasConsumption: UtilityConsumptionParams = {
              meterType: 'Gas',
              utilityData: gasConsumption,
              page: utilityMetersConsumptionPage,
              state: 'updated',
            };

            await saveUtilityConsumptionFromChart(chartUpdatedGasConsumption);

            const gasIncreasingOnChart = gasConsumption.updated.chart.total - gasConsumption.initial.chart.total;

            expect(gasIncreasingOnChart).toBeCloseTo(utilityReading.gas.consumption, 2);

            return utilityMetersConsumptionPage;
          },
        );

        await step(
          'Added utility reading values for "Gas" affected "Consumption" values in the "Utility meters history" table',
          async () => {
            const date = getUtilityReadingDate(utilityReading.gas);
            const tableUpdatedGasConsumption: UtilityConsumptionParams & UtilityReadingParams = {
              meterType: 'Gas',
              utilityReading: utilityReading.gas,
              utilityData: gasConsumption,
              page: utilityMetersConsumptionPage,
              state: 'updated',
            };

            await saveUtilityConsumptionFromTable(tableUpdatedGasConsumption);

            if (date.from.month !== date.to.month) {
              const totalConsumption =
                gasConsumption.updated.table.totalFromMonth -
                gasConsumption.initial.table.totalFromMonth +
                (gasConsumption.updated.table.totalToMonth - gasConsumption.initial.table.totalToMonth);

              expect(totalConsumption).toBeCloseTo(utilityReading.gas.consumption, 2);
            } else if (date.from.month === date.to.month) {
              const totalConsumption =
                gasConsumption.updated.table.totalToMonth - gasConsumption.initial.table.totalToMonth;

              expect(totalConsumption).toBeCloseTo(utilityReading.gas.consumption, 2);
            }
          },
        );

        const utilityMetersSpendPage = await step(
          'Added utility reading values for "Gas" affected "Spend" values on chart',
          async () => {
            const energyPage = await buildingViewSideMenu.openEnergyPage();
            const utilityMetersSpendPage = await energyPage.openSpendMode();
            await utilityMetersSpendPage.selectCurrency(defaultCurrency);

            await utilityMetersSpendPage.switchView('Utility units');

            const chartUpdatedGasSpend: UtilitySpendParams = {
              meterType: 'Gas',
              utilityData: gasSpend,
              page: utilityMetersSpendPage,
              state: 'updated',
            };

            await saveUtilitySpendFromChart(chartUpdatedGasSpend);

            const gasIncreasingOnChart = gasSpend.updated.chart.total - gasSpend.initial.chart.total;

            expect(gasIncreasingOnChart).toBeCloseTo(utilityReading.gas.spend, 2);

            return utilityMetersSpendPage;
          },
        );

        await step(
          'Added utility reading values for "Gas" affected "Spend" values in the "Utility meters history" table',
          async () => {
            const date = getUtilityReadingDate(utilityReading.gas);
            const tableUpdatedGasSpend: UtilitySpendParams & UtilityReadingParams = {
              meterType: 'Gas',
              utilityReading: utilityReading.gas,
              utilityData: gasSpend,
              page: utilityMetersSpendPage,
              state: 'updated',
            };

            await saveUtilitySpendFromTable(tableUpdatedGasSpend);

            if (date.from.month !== date.to.month) {
              const totalConsumption =
                gasConsumption.updated.table.totalFromMonth -
                gasConsumption.initial.table.totalFromMonth +
                (gasConsumption.updated.table.totalToMonth - gasConsumption.initial.table.totalToMonth);

              expect(totalConsumption).toBeCloseTo(utilityReading.gas.consumption, 2);
            } else if (date.from.month === date.to.month) {
              const totalConsumption =
                gasConsumption.updated.table.totalToMonth - gasConsumption.initial.table.totalToMonth;

              expect(totalConsumption).toBeCloseTo(utilityReading.gas.consumption, 2);
            }
          },
        );

        utilityMetersPage = await step('open Utility Meters page', async () => {
          return buildingViewSideMenu.openSettingsPage().then((p) => p.settingsSideMenu.openUtilityMetersPage());
        });

        utilityMetersPage = await step(`archive the meter with ID=${updateGasMeterRequest.meterNo}`, async () => {
          utilityMetersPage = await utilityMetersPage.archiveMeter(updateGasMeterRequest.meterName);

          return utilityMetersPage;
        });
      });

      test(`Utility reading values for Water meter affected Energy interface values`, async ({ globalAdminPage }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-19864', 'ABOUND-19864');

        const createWaterMeterRequest = meterRequest.create.water;

        const buildingViewSideMenu = await step(
          'save initial "Consumption" & "Spend" values for "Water" from chart and table',
          async () => {
            const buildingViewSideMenu = (await openBuildingView(globalAdminPage, { buildingName: BUILDING.name }))
              .buildingViewSideMenu;
            const energyPage = await buildingViewSideMenu.openEnergyPage();
            const utilityMetersConsumptionPage = await energyPage.openConsumptionMode();
            await utilityMetersConsumptionPage.selectCurrency(defaultCurrency);

            await utilityMetersConsumptionPage.switchView('Utility units');

            const chartInitialWaterConsumption: UtilityConsumptionParams = {
              meterType: 'Water',
              utilityData: waterConsumption,
              page: utilityMetersConsumptionPage,
              state: 'initial',
            };

            const tableInitialWaterConsumption: UtilityConsumptionParams & UtilityReadingParams = {
              meterType: 'Water',
              utilityReading: utilityReading.water,
              utilityData: waterConsumption,
              page: utilityMetersConsumptionPage,
              state: 'initial',
            };

            await saveUtilityConsumptionFromChart(chartInitialWaterConsumption);
            await saveUtilityConsumptionFromTable(tableInitialWaterConsumption);

            const utilityMetersSpendPage = await energyPage.openSpendMode();
            await utilityMetersSpendPage.selectCurrency(defaultCurrency);

            await utilityMetersSpendPage.switchView('Utility units');

            const chartInitialWaterSpend: UtilitySpendParams = {
              meterType: 'Water',
              utilityData: waterSpend,
              page: utilityMetersSpendPage,
              state: 'initial',
            };

            const tableInitialWaterSpend: UtilitySpendParams & UtilityReadingParams = {
              meterType: 'Water',
              utilityReading: utilityReading.water,
              utilityData: waterSpend,
              page: utilityMetersSpendPage,
              state: 'initial',
            };

            await saveUtilitySpendFromChart(chartInitialWaterSpend);
            await saveUtilitySpendFromTable(tableInitialWaterSpend);

            return buildingViewSideMenu;
          },
        );

        let utilityMetersPage = await step('open Utility Meters page', async () => {
          return buildingViewSideMenu.openSettingsPage().then((p) => p.settingsSideMenu.openUtilityMetersPage());
        });

        await step(`create a meter with meterID=${createWaterMeterRequest.meterNo}`, async () => {
          utilityMetersPage = await utilityMetersPage.createMeter(createWaterMeterRequest);

          return utilityMetersPage;
        });

        utilityMetersPage = await step(
          `search for the meter with name=${createWaterMeterRequest.meterName} after the meter creation`,
          async () => {
            utilityMetersPage = await utilityMetersPage.filterMetersWithoutReset([
              ByTextMeterFilter.of(createWaterMeterRequest.meterName),
            ]);

            const searchResults = await utilityMetersPage.getVisibleMeters();

            expect(searchResults[0].meterName).toEqual(createWaterMeterRequest.meterName);
            expect(searchResults[0].meterNo).toEqual(createWaterMeterRequest.meterNo);
            expect(searchResults[0].status).toEqual(Status.inactive);

            return utilityMetersPage;
          },
        );

        utilityMetersPage = await step(
          `add utility reading for meter with ID=${createWaterMeterRequest.meterNo}`,
          async () => {
            const utilityMeterDetailsPage = await utilityMetersPage.openManualMeterDetailsPage(
              createWaterMeterRequest.meterName,
            );

            expect(utilityMeterDetailsPage.getMeterInfo()).toEqual(
              UtilityMeterDetails.createFromMeterCreateRequest(
                createWaterMeterRequest,
                globalAdminPage.user.email,
                TODAY,
              ),
            );

            await utilityMeterDetailsPage.addReading(utilityReading.water);
            await utilityMeterDetailsPage.goBackToUtilityMetersPage();

            utilityMetersPage = await utilityMetersPage.filterMeters([
              ByTextMeterFilter.of(createWaterMeterRequest.meterName),
            ]);
            const searchResult = await utilityMetersPage.getVisibleMeters();

            expect(searchResult[0].status).toEqual(Status.manual);
            expect(searchResult[0].consumption).toEqual(
              `${utilityReading.water.consumption.toString()} ${createWaterMeterRequest.shortUnit}`,
            );
            expect(searchResult[0].spend?.value).toEqual(utilityReading.water.spend);

            return utilityMetersPage;
          },
        );

        const utilityMetersConsumptionPage = await step(
          'Added utility reading values for "Water" affected "Consumption" values on chart',
          async () => {
            const energyPage = await buildingViewSideMenu.openEnergyPage();
            const utilityMetersConsumptionPage = await energyPage.openConsumptionMode();
            await utilityMetersConsumptionPage.selectCurrency(defaultCurrency);

            await utilityMetersConsumptionPage.switchView('Utility units');

            const updatedWaterConsumptionChart: UtilityConsumptionParams = {
              meterType: 'Water',
              utilityData: waterConsumption,
              page: utilityMetersConsumptionPage,
              state: 'updated',
            };

            await saveUtilityConsumptionFromChart(updatedWaterConsumptionChart);

            const waterIncreasingOnChart = waterConsumption.updated.chart.total - waterConsumption.initial.chart.total;

            expect(waterIncreasingOnChart).toBeCloseTo(utilityReading.water.consumption, 2);

            return utilityMetersConsumptionPage;
          },
        );

        await step(
          'Added utility reading values for "Water" affected "Consumption" values in the "Utility meters history" table',
          async () => {
            const date = getUtilityReadingDate(utilityReading.water);

            const tableUpdatedWaterConsumption: UtilityConsumptionParams & UtilityReadingParams = {
              meterType: 'Water',
              utilityReading: utilityReading.water,
              utilityData: waterConsumption,
              page: utilityMetersConsumptionPage,
              state: 'updated',
            };

            await saveUtilityConsumptionFromTable(tableUpdatedWaterConsumption);

            if (date.from.month !== date.to.month) {
              const totalConsumption =
                waterConsumption.updated.table.totalFromMonth -
                waterConsumption.initial.table.totalFromMonth +
                (waterConsumption.updated.table.totalToMonth - waterConsumption.initial.table.totalToMonth);

              expect(totalConsumption).toBeCloseTo(utilityReading.water.consumption, 2);
            } else if (date.from.month === date.to.month) {
              const totalConsumption =
                waterConsumption.updated.table.totalToMonth - waterConsumption.initial.table.totalToMonth;

              expect(totalConsumption).toBeCloseTo(utilityReading.water.consumption, 2);
            }
          },
        );

        const utilityMetersSpendPage = await step(
          'Added utility reading values for "Water" affected "Spend" values on chart',
          async () => {
            const energyPage = await buildingViewSideMenu.openEnergyPage();
            const utilityMetersSpendPage = await energyPage.openSpendMode();
            await utilityMetersSpendPage.selectCurrency(defaultCurrency);

            await utilityMetersSpendPage.switchView('Utility units');

            const chartUpdatedWaterSpend: UtilitySpendParams = {
              meterType: 'Water',
              utilityData: waterSpend,
              page: utilityMetersSpendPage,
              state: 'updated',
            };

            await saveUtilitySpendFromChart(chartUpdatedWaterSpend);

            const waterIncreasingOnChart = waterSpend.updated.chart.total - waterSpend.initial.chart.total;

            expect(waterIncreasingOnChart).toBeCloseTo(utilityReading.water.spend, 2);

            return utilityMetersSpendPage;
          },
        );

        await step(
          'Added utility reading values for "Water" affected "Spend" values in the "Utility meters history" table',
          async () => {
            const date = getUtilityReadingDate(utilityReading.water);
            const tableUpdatedWaterSpend: UtilitySpendParams & UtilityReadingParams = {
              meterType: 'Water',
              utilityReading: utilityReading.water,
              utilityData: waterSpend,
              page: utilityMetersSpendPage,
              state: 'updated',
            };

            await saveUtilitySpendFromTable(tableUpdatedWaterSpend);

            if (date.from.month !== date.to.month) {
              const totalConsumption =
                waterConsumption.updated.table.totalFromMonth -
                waterConsumption.initial.table.totalFromMonth +
                (waterConsumption.updated.table.totalToMonth - waterConsumption.initial.table.totalToMonth);

              expect(totalConsumption).toBeCloseTo(utilityReading.water.consumption, 2);
            } else if (date.from.month === date.to.month) {
              const totalConsumption =
                waterConsumption.updated.table.totalToMonth - waterConsumption.initial.table.totalToMonth;

              expect(totalConsumption).toBeCloseTo(utilityReading.water.consumption, 2);
            }
          },
        );
      });

      test.afterAll('remove the created meters', async () => {
        const metersToRemove = [meterRequest.update.gas.meterName, meterRequest.create.water.meterName];

        for (const meter of metersToRemove) {
          await UtilityMetersActions.removeMetersBySearchString(meter, BUILDING.id);
        }
      });
    });
  },
);
