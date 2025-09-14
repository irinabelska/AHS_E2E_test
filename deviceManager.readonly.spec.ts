import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import {
  Building,
  BuildingName,
  getBuildingByName,
  getBuildingForDevEnv,
  getBuildingForPreProdEnv,
  getBuildingForProdEnv,
  getBuildingForQaEnv,
} from '@/tests/playwright/framework/entities/Buildings';
import { BuildingDeviceManagerPage } from '@/tests/playwright/framework/pages/buildingview/device/manager/DeviceManagerPage';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/framework/utils/map.utils';
import {
  DeviceLibraryRoomSelector,
  EquipmentTypeFilter,
} from '@/tests/playwright/framework/pages/buildingview/device/manager/DeviceLibraryTable';
import { DeviceGroup } from '@/tests/playwright/framework/pages/buildingview/device/DeviceNavigator';
import { BuildingSelector, RoomSelector } from '@/tests/playwright/framework/entities/LocationSelector';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { BuildingStandards } from '@/tests/playwright/framework/entities/BuildingStandards';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import {
  NineFIaqMetrics,
  WellIaqMetrics,
} from '@/tests/playwright/framework/pages/buildingview/device/MapOverplayWellModal';

test.describe(
  'Device Manager',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    interface TestConfig {
      building: Building;
      floorName: string;
      roomName: string;
      device: { id: string; shortName: string; group: DeviceGroup };
      equipmentTypeFilter: EquipmentTypeFilter;
    }

    const CONFIGS: Map<Env, TestConfig> = new Map<Env, TestConfig>([
      [
        Env.QA,
        {
          building: getBuildingForQaEnv(BuildingName.ALC_NY_MAIN),
          floorName: 'Level 4',
          roomName: '400 Corridor',
          device: { id: '96beace8-a7d5-4959-9511-0c9af8dce800', shortName: '2920017304', group: 'iaq' },
          equipmentTypeFilter: 'IAQ',
        },
      ],
      [
        Env.DEV,
        {
          building: getBuildingForDevEnv(BuildingName.TYSONS_SITE),
          floorName: 'Floor 1',
          roomName: 'Delta Club Lounge',
          device: {
            id: '6c118f06-ff96-4062-bee2-0b901979dca3',
            shortName: 'Spa-Lounge',
            group: 'hvac',
          },
          equipmentTypeFilter: 'RTU',
        },
      ],
      [
        Env.LOCAL,
        {
          building: getBuildingForDevEnv(BuildingName.CARRIER_ATL_HUB_3350),
          floorName: 'Floor 9',
          roomName: 'Open Office SW',
          device: {
            id: 'ab7d8098-ca61-42f3-a569-2b877b4fc627',
            shortName: 'IAQ Device FSAS-LoRa-poc10080E115000AD119',
            group: 'iaq',
          },
          equipmentTypeFilter: 'IAQ_Sensor',
        },
      ],
      [
        Env.PRE_PROD,
        {
          building: getBuildingForPreProdEnv(BuildingName.NY_NJ_OFFICE),
          floorName: 'Level 4',
          roomName: '434 Open Office Area',
          device: { id: '8e62e0b2-8624-4c32-a6b0-c207c9cf2f82', shortName: '2969000835', group: 'iaq' },
          equipmentTypeFilter: 'IAQ',
        },
      ],
      [
        Env.PROD,
        {
          building: getBuildingForProdEnv(BuildingName.DEAL_BUILDING),
          floorName: 'Floor 05',
          roomName: '05.630 Break Out',
          device: {
            id: '742ca605-d821-4340-9d85-1657152e4e35',
            shortName: '2b1fe7a26a3ca36c4681f42f7645cc2b',
            group: 'iaq',
          },
          equipmentTypeFilter: 'IAQ',
        },
      ],
    ]);

    const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

    const knownIssues: KnownIssue[] = [];

    test('smoke test', async ({ globalAdminPage, withKnownIssues }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6078', 'ABOUND-6078');

      await withKnownIssues(knownIssues).run(async () => {
        const building: Building = getBuildingByName(CONFIG.building.name);
        const customer = getCustomerForEnv(building.site.customerName);
        const buildingViewPage = await openBuildingView(globalAdminPage, {
          buildingName: building.name,
          featureFlags: {
            deviceManagerNotVisible: false,
          },
        });
        const standard = await BuildingStandards.getApiSelectedIaqStandard(customer);
        const deviceManagerPage = await buildingViewPage.openDeviceManagerPage(standard);

        const device = CONFIG.device;
        const spaceNavigatorBuildingSelector = new BuildingSelector(building.name);
        const spaceNavigatorRoomSelector = new RoomSelector(building.name, CONFIG.floorName, CONFIG.roomName);
        const deviceLibraryRoomSelector = new DeviceLibraryRoomSelector(CONFIG.floorName, CONFIG.roomName);

        let buildingDeviceManagerPage: BuildingDeviceManagerPage = await step(
          'test device manager on building level',
          async () => {
            allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6076', 'ABOUND-6076');
            allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6072', 'ABOUND-6072');
            let buildingDeviceManagerPage =
              await deviceManagerPage.selectBuildingLocation(spaceNavigatorBuildingSelector);

            expect(buildingDeviceManagerPage.onlineDevices).toBeGreaterThanOrEqual(0);
            expect(buildingDeviceManagerPage.offlineDevices).toBeGreaterThanOrEqual(0);

            buildingDeviceManagerPage = await step('check device details page', async () => {
              allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6089', 'ABOUND-6089');
              await deviceManagerPage.selectDevice(device.group, device.shortName);
              const librarySelectedDevice = await deviceManagerPage.getSelectedDevicesFromLibraryTable();

              if (!librarySelectedDevice) {
                throw new Error(
                  `Device ${device.shortName} is not selected in library table after being selected in device navigator`,
                );
              }

              expect(device.id).toEqual(librarySelectedDevice.id);

              if (device.group === 'iaq') {
                await deviceManagerPage.clickIaqDeviceInLibrary(device.id).then((_) => _.clickBack());
              }

              return deviceManagerPage;
            });

            buildingDeviceManagerPage = await step('check filtering by equipment type', async () => {
              buildingDeviceManagerPage = await buildingDeviceManagerPage.filterTable({
                equipmentType: CONFIG.equipmentTypeFilter,
              });

              const filteredDevices = await buildingDeviceManagerPage.getDevicesFromLibraryTable(10);

              expect(new Set(filteredDevices.map((d) => d.group))).toEqual(new Set([device.group]));

              return buildingDeviceManagerPage;
            });

            buildingDeviceManagerPage = await step('check filtering by status', async () => {
              allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6081', 'ABOUND-6081');
              allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6082', 'ABOUND-6082');
              buildingDeviceManagerPage = await buildingDeviceManagerPage.filterTable({ status: 'Online' });

              const onlineDevices = await buildingDeviceManagerPage.getDevicesFromLibraryTable(10);

              const uniqueStatuses = new Set(onlineDevices.map((d) => d.status));

              if (uniqueStatuses.size > 0) {
                expect(uniqueStatuses).toEqual(new Set(['online']));
              }

              return buildingDeviceManagerPage;
            });

            const roomDeviceManagerPage = await step('check filtering by location', async () => {
              allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6079', 'ABOUND-6079');
              const roomDeviceManagerPage =
                await buildingDeviceManagerPage.filterTableByFloorOrRoom(deviceLibraryRoomSelector);

              const filteredDevices = await roomDeviceManagerPage.getDevicesFromLibraryTable(10);

              expect(new Set(filteredDevices.map((d) => d.location))).toEqual(
                new Set([deviceLibraryRoomSelector.roomName]),
              );
              expect((await roomDeviceManagerPage.spaceNavigator.getSelected()).label).toEqual(
                deviceLibraryRoomSelector.roomName,
              );

              return roomDeviceManagerPage;
            });

            return roomDeviceManagerPage.selectBuildingLocation(spaceNavigatorBuildingSelector);
          },
        );

        const roomDeviceManagerPage = await step('test device manager on room level', async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6090', 'ABOUND-6090');
          const roomDeviceManagerPage =
            await buildingDeviceManagerPage.selectFloorOrRoomLocation(spaceNavigatorRoomSelector);

          const devices = await roomDeviceManagerPage.getDevicesFromLibraryTable(10);
          const deviceUniqueLocations = new Set(devices.map((d) => d.location));
          expect(deviceUniqueLocations).toEqual(new Set([spaceNavigatorRoomSelector.roomName]));

          return step('test map overlay', async () => {
            allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6580', 'ABOUND-6580');
            const roomDeviceManagerPage = await deviceManagerPage.selectFloorOrRoomLocation(spaceNavigatorRoomSelector);

            let mapOverplaysModal = await roomDeviceManagerPage.openFloorMenu();
            mapOverplaysModal = await mapOverplaysModal.clickIaqHeader();

            let iaqButtons;

            if (standard === BuildingStandards.wellStandard) {
              iaqButtons = mapOverplaysModal.body as WellIaqMetrics;
              expect(await iaqButtons.allIaqMetrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.temperatureMetrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.humidityMetrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.co2Metrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.tvocsMetrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.radonMetrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.pm25Metrics.isDisplayed()).toBeTruthy();
            } else {
              iaqButtons = mapOverplaysModal.body as NineFIaqMetrics;
              expect(await iaqButtons.allMetrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.iaqScoreMetrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.trhScoreMetrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.temperatureMetrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.relativeHumidityMetrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.co2Metrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.tvocsMetrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.radonMetrics.isDisplayed()).toBeTruthy();
              expect(await iaqButtons.pm25Metrics.isDisplayed()).toBeTruthy();
            }

            mapOverplaysModal = await mapOverplaysModal.clickHvacHeader();
            expect(await iaqButtons.temperatureMetrics.isEnabled()).toBeFalsy();
            await mapOverplaysModal.clickIaqHeader();

            return roomDeviceManagerPage.closeFloorMenu();
          });
        });

        buildingDeviceManagerPage = await roomDeviceManagerPage.selectBuildingLocation(spaceNavigatorBuildingSelector);
        await step('clicking on device location redirects to device manager page for given location', async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6090', 'ABOUND-6090');

          buildingDeviceManagerPage = await buildingDeviceManagerPage.selectDevice(device.group, device.shortName);
          const foundDevice = await buildingDeviceManagerPage.forceGetSelectedDevicesFromLibraryTable();

          const floorOrRoomDeviceManagerPage = await buildingDeviceManagerPage.clickOnDeviceLocation(
            foundDevice.shortName,
          );
          const visibleDevices = await floorOrRoomDeviceManagerPage.getDevicesFromLibraryTable(10);

          visibleDevices.forEach((visibleDevice) => visibleDevice.location.includes(foundDevice.location));

          return floorOrRoomDeviceManagerPage;
        });
      });
    });
  },
);
