import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { gl } from 'date-fns/locale';

import { TemperaturePreferenceUnit } from '@/framework/constants/preferenceUnits';
import { step, test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import {
  Building,
  BuildingName,
  getBuildingForDevEnv,
  getBuildingForPreProdEnv,
  getBuildingForQaEnv,
} from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { UnitPreferences } from '@/tests/playwright/framework/pages/buildingview/settings/profile/unitpreferences/UnitPreferencesComponent';
import { ProfilePage } from '@/tests/playwright/framework/pages/buildingview/settings/profile/ProfilePage';
import { BuildingView } from '@/tests/playwright/framework/pages/BuildingView';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { BuildingStandards } from '@/tests/playwright/framework/entities/BuildingStandards';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { getAreaUnit } from '@/tests/playwright/framework/pages/buildingview/settings/profile/unitpreferences/DistanceAreaUnitPreference';
import { getTemperatureUnitSymbol } from '@/framework/utils/measurement.utils';

test.describe.configure({ mode: 'serial' });

test.describe(
  'Imperial and Metric units',
  {
    tag: ['@regression', '@ui', '@parallel', '@journey'],
  },
  () => {
    const BUILDINGS = new Map<Env, Building>([
      [Env.PROD, getBuildingForPreProdEnv(BuildingName.CAR_CIB)],
      [Env.PRE_PROD, getBuildingForPreProdEnv(BuildingName.CIB)],
      [Env.QA, getBuildingForQaEnv(BuildingName.ALC_NY_MAIN)],
      [Env.DEV, getBuildingForDevEnv(BuildingName.CIB)],
      [Env.LOCAL, getBuildingForDevEnv(BuildingName.CIB)],
    ]);

    const BUILDING = forceGetFromMap(BUILDINGS, getCurrentEnv());

    interface UnitSystem {
      name: string;
      units: UnitPreferences;
    }

    const UNIT_SYSTEMS: UnitSystem[] = [
      {
        name: 'metric',
        units: {
          temperature: TemperaturePreferenceUnit.Celsius,
          distanceArea: 'm/m²',
          energy: 'gigajoule',
          water: 'Liter',
          steam: 'gigajoule',
          naturalGas: 'kWh',
        },
      },
      {
        name: 'imperial',
        units: {
          temperature: TemperaturePreferenceUnit.Fahrenheit,
          distanceArea: 'ft/ft',
          energy: 'kBtu',
          water: 'Gallons',
          steam: 'kBtu',
          naturalGas: 'Therms',
        },
      },
    ];

    const knownIssues: KnownIssue[] = [
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-16466',
        expectedException(Error, ".*getByTestId\\('energy-consumption-spend-total-energy-spend-and-consumption'\\).*"),
      ),
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-17824',
        expectedException(Error, '.*wait for skeletons to disappear.*'),
      ),
    ];

    for (const unitSystem of UNIT_SYSTEMS) {
      test(`units should be displayed properly across whole Abound application for ${unitSystem.name} unit system`, async ({
        secondGlobalAdminPage,
        withKnownIssues,
      }) => {
        allure.description(`
    Units are the bread&butter for Abound application. Currently application supports two measurement systems: Imperial and Metric.
    Unit preferences can be set in user profiles and once set, all measurements should follow the configuration. The only exception to this
    rule can be found on Settings -> Utility meters page. Utility meters measurements are always displayed using units configured for the utility meter.
    `);
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-13034', 'ABOUND-13034');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-13073', 'ABOUND-13073');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-13238', 'ABOUND-13238');

        await withKnownIssues(knownIssues).run(async () => {
          let buildingViewPage: BuildingView = await step("set user's unit preferences", async () => {
            const profilePage: ProfilePage = await openBuildingView(secondGlobalAdminPage, {
              buildingName: BUILDING.name,
              featureFlags: {
                imperialOrSiUnitsSelectionForMeasuringEnergyAvailable: true,
              },
            })
              .then((_) => _.buildingViewSideMenu.openSettingsPage())
              .then((_) => _.settingsSideMenu.openUserProfilePage())
              .then((_) => _.setUserPreferences(unitSystem.units));

            expect(await profilePage.getUserUnitPreferences()).toEqual(unitSystem.units);

            return profilePage;
          });
          // TODO: Add Building list Utility performance table subheaders unit check

          await step('units are properly displayed on Energy page', async () => {
            let energyPage = await buildingViewPage.buildingViewSideMenu.openEnergyPage();

            energyPage = await step('units are properly displayed on consumption and spend mode', async () => {
              const consumptionMode = await energyPage.openConsumptionMode();

              await step('units are properly displayed on total energy consumption pie chart', async () => {
                const utilityConsumption = await consumptionMode.getTotalEnergyConsumptionByUtility();
                const totalUtilityConsumption = await consumptionMode.getTotalEnergyConsumption();

                expect(utilityConsumption.electricity.consumptionInEnergyUnits.unit).toEqual(unitSystem.units.energy);
                expect(utilityConsumption.gas.consumptionInEnergyUnits.unit).toEqual(unitSystem.units.energy);
                expect(utilityConsumption.steam.consumptionInEnergyUnits.unit).toEqual(unitSystem.units.energy);

                expect(totalUtilityConsumption.unit).toEqual(unitSystem.units.energy);

                expect(utilityConsumption.electricity.consumptionInUtilityUnits.unit).toEqual('kWh');
                expect(utilityConsumption.gas.consumptionInUtilityUnits.unit).toEqual(unitSystem.units.naturalGas);
                expect(utilityConsumption.steam.consumptionInUtilityUnits.unit).toEqual(unitSystem.units.steam);
              });

              return energyPage;
            });

            await step('units are properly displayed on energy user intensity mode', async () => {
              const consumptionIntensity = await energyPage
                .openConsumptionMode()
                .then((_) => _.switchView('Intensity'));
              const expectedAreaUnit = getAreaUnit(unitSystem.units.distanceArea);

              await step('units are properly displayed on consumption pie chart', async () => {
                const totalConsumptionIntensity = await consumptionIntensity.getTotalEnergyConsumption();
                const consumptionIntensityPerUtilities =
                  await consumptionIntensity.getTotalEnergyConsumptionByUtility();

                expect(totalConsumptionIntensity.unit).toEqual(`${unitSystem.units.energy}/${expectedAreaUnit}`);
                expect(consumptionIntensityPerUtilities.electricity.consumptionInUtilityUnits.unit).toEqual(
                  `kWh/${expectedAreaUnit}`,
                );
                expect(consumptionIntensityPerUtilities.electricity.consumptionInEnergyUnits.unit).toEqual(
                  `${unitSystem.units.energy}/${expectedAreaUnit}`,
                );

                expect(consumptionIntensityPerUtilities.gas.consumptionInUtilityUnits.unit).toEqual(
                  `${unitSystem.units.naturalGas}/${expectedAreaUnit}`,
                );
                expect(consumptionIntensityPerUtilities.gas.consumptionInEnergyUnits.unit).toEqual(
                  `${unitSystem.units.energy}/${expectedAreaUnit}`,
                );

                expect(consumptionIntensityPerUtilities.steam.consumptionInUtilityUnits.unit).toEqual(
                  `${unitSystem.units.steam}/${expectedAreaUnit}`,
                );
                expect(consumptionIntensityPerUtilities.steam.consumptionInEnergyUnits.unit).toEqual(
                  `${unitSystem.units.energy}/${expectedAreaUnit}`,
                );
              });

              return energyPage;
            });
          });

          if (!secondGlobalAdminPage.user.featureEnabled('deviceManagerNotVisible')) {
            buildingViewPage = await step('units are properly displayed on Device Manager page', async () => {
              const customer = getCustomerForEnv(BUILDING.site.customerName);
              const standard = await BuildingStandards.getApiSelectedIaqStandard(customer);
              let deviceManagerPage = await buildingViewPage.buildingViewSideMenu.openDeviceManagerPage(standard);
              deviceManagerPage = await deviceManagerPage.filterTable({ equipmentType: 'IAQ' });
              const iaqDevice = await deviceManagerPage.getDevicesFromLibraryTable(1).then((_) => _[0]);

              if (!iaqDevice) {
                throw Error('no iaq devices in a building');
              }

              deviceManagerPage = await step('units are properly displayed on building level', async () => {
                const deviceDetailsPage = await deviceManagerPage.clickIaqDeviceInLibrary(iaqDevice.id);

                if (deviceDetailsPage.performanceSummary.temperature) {
                  expect(deviceDetailsPage.performanceSummary.temperature.unit).toEqual(unitSystem.units.temperature);
                }

                return deviceDetailsPage.clickBack();
              });

              return step('units are properly displayed on floor/room level', async () => {
                const floorOrRoomDeviceManagerPage = await deviceManagerPage.clickOnDeviceLocation(iaqDevice.shortName);

                const metrics = (await floorOrRoomDeviceManagerPage.hooverOverDevice(iaqDevice.id)).getMetrics();
                if (metrics.temperature) {
                  expect(metrics.temperature.unit).toEqual(unitSystem.units.temperature);
                } else {
                  throw new Error(
                    `No temperature metric iaqDevice '${iaqDevice.shortName}' in the '${BUILDING.name}' building`,
                  );
                }

                return floorOrRoomDeviceManagerPage;
              });
            });

            await step('temperature units are properly displayed Temperature alarms in Alarm center', async () => {
              const alarmCenterPage = await buildingViewPage.buildingViewSideMenu.openAlarmCenterPage();
              const temperatureAlarms = await alarmCenterPage
                .getAlarms(50)
                .then((_) => _.filter((_) => _.description.toLowerCase().includes('temperature')));
              if (temperatureAlarms.length > 0) {
                temperatureAlarms.forEach((_) => {
                  expect(
                    _.description.includes(getTemperatureUnitSymbol(unitSystem.units.temperature)),
                    `Alarm '${_.description} not includes selected unit '${unitSystem.units.temperature}`,
                  );
                });
              } else {
                await test.info().attach('No temperature alarms found to test');
              }
            });
          }
        });
      });
    }
  },
);
