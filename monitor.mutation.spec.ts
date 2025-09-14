import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import {
  Building,
  BuildingName,
  getBuildingForDevEnv,
  getBuildingForPreProdEnv,
  getBuildingForProdEnv,
  getBuildingForQaEnv,
} from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/framework/utils/map.utils';
import {
  NineFIaqMetrics,
  WellIaqMetrics,
} from '@/tests/playwright/framework/pages/buildingview/device/MapOverplayWellModal';
import { FloorSelector, RoomSelector } from '@/tests/playwright/framework/entities/LocationSelector';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { BuildingStandards } from '@/tests/playwright/framework/entities/BuildingStandards';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

interface TestConfig {
  building: Building;
  floorName: string;
  roomName: string;
  hvacAhuDeviceName: string;
  hvacVavDeviceName: string | null;
  iaqDeviceName: string;
  deviceToHoverOverId: string;
}

const CONFIGS: Map<Env, TestConfig> = new Map<Env, TestConfig>([
  [
    Env.QA,
    {
      building: getBuildingForQaEnv(BuildingName.ALC_NY_MAIN),
      floorName: 'Level 4',
      roomName: '400 Corridor',
      hvacAhuDeviceName: 'AHU.AHU-1',
      iaqDeviceName: '2920017304',
      hvacVavDeviceName: 'VAV.ACCOUNTING-423',
      deviceToHoverOverId: 'b40cf3d0-6823-4692-a12e-6b7ce94321d0',
    },
  ],
  [
    Env.LOCAL,
    {
      building: getBuildingForDevEnv(BuildingName.ALC_NY_MAIN),
      floorName: 'Level 4',
      roomName: '434 Open Office Area',
      hvacAhuDeviceName: 'AHU.AHU-1',
      iaqDeviceName: '2969002155',
      hvacVavDeviceName: 'VAV.ACCOUNTING-423',
      deviceToHoverOverId: 'cabc5701-4de4-43dc-a24a-150ea83c576a',
    },
  ],
  [
    Env.DEV,
    {
      building: getBuildingForDevEnv(BuildingName.ALC_NY_MAIN),
      floorName: 'Level 4',
      roomName: '434 Open Office Area',
      hvacAhuDeviceName: 'AHU.AHU-1',
      iaqDeviceName: '2969002155',
      hvacVavDeviceName: 'VAV.ACCOUNTING-423',
      deviceToHoverOverId: 'cabc5701-4de4-43dc-a24a-150ea83c576a',
    },
  ],
  [
    Env.PRE_PROD,
    {
      building: getBuildingForPreProdEnv(BuildingName.NY_NJ_OFFICE),
      floorName: 'Level 4',
      roomName: '434 Open Office Area',
      hvacAhuDeviceName: 'AHU.AHU-1',
      hvacVavDeviceName: 'VAV.ACCOUNTING-423',
      iaqDeviceName: '2969000835',
      deviceToHoverOverId: '7d703a1b-34b7-418f-9ada-be9a16b99d45',
    },
  ],
  [
    Env.PROD,
    {
      building: getBuildingForProdEnv(BuildingName.ALC_NY_NJ),
      floorName: 'Level 4',
      roomName: '434 Open Office Area',
      hvacAhuDeviceName: 'AHU.AHU-1',
      hvacVavDeviceName: 'VAV.ACCOUNTING-423',
      iaqDeviceName: '2969000835',
      deviceToHoverOverId: '7d703a1b-34b7-418f-9ada-be9a16b99d45',
    },
  ],
]);

const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

const BUILDING = CONFIG.building;
const FLOOR_NAME = CONFIG.floorName;
const ROOM_NAME = CONFIG.roomName;

const knownIssues: KnownIssue[] = [];

test.describe('Monitor', () => {
  test(
    'Monitor page displays with 9f standard',
    {
      tag: ['@regression', '@ui', '@setIaqStandardAlc'],
    },
    async ({ globalAdminPage, withKnownIssues }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15808', 'ABOUND-15808 - 9F Map Overlays');

      await withKnownIssues(knownIssues).run(async () => {
        const customer = getCustomerForEnv(BUILDING.site.customerName);

        const buildingViewPage = await openBuildingView(globalAdminPage, {
          buildingName: BUILDING.name,
          featureFlags: {
            monitorNotVisible: false,
            portfolioBuildingStandardsAvailable: true,
          },
        });
        await BuildingStandards.setApiIaqStandard(BuildingStandards.nineFStandard, customer);

        const buildingLevelMonitorPage = await buildingViewPage.buildingViewSideMenu.openMonitorPage(
          BuildingStandards.nineFStandard,
        );

        await step('Building level: check 9F tab displays in aside tabs', () => {
          expect(buildingLevelMonitorPage.aside.asideTabs.containsTab('9 Foundations')).toBeTruthy();
        });

        await step('Building level: check iaq&hvac metric overlay iaq&trh buttons', async () => {
          expect(
            await buildingLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.byDeviceButton.isEnabled(),
          ).toBeFalsy();
          expect(
            await buildingLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.bySpaceButton.isEnabled(),
          ).toBeTruthy();

          let buildingMapMenu = await buildingLevelMonitorPage.openFloorMenu();
          expect(await buildingMapMenu.header.iaqButton.isDisplayed()).toBeTruthy();
          expect(await buildingMapMenu.header.hvacButton.isDisplayed()).toBeTruthy();
          expect(await buildingMapMenu.header.alertsButton.isDisplayed()).toBeTruthy();
          expect(await buildingMapMenu.header.energyButton.isDisplayed()).toBeTruthy();
          expect(await buildingMapMenu.header.occupancyButton.isDisplayed()).toBeTruthy();
          await buildingMapMenu.clickHvacHeader();
          const hvacButtons = buildingMapMenu.body as NineFIaqMetrics;
          expect(await hvacButtons.iaqScoreMetrics.isEnabled()).toBeFalsy();
          expect(await hvacButtons.trhScoreMetrics.isEnabled()).toBeFalsy();

          buildingMapMenu = await buildingMapMenu.clickIaqHeader();

          const iaqButtons = buildingMapMenu.body as NineFIaqMetrics;
          expect(await iaqButtons.iaqScoreMetrics.isEnabled()).toBeTruthy();
          expect(await iaqButtons.trhScoreMetrics?.isEnabled()).toBeTruthy();
        });

        await step('Floor level: check iaq&hvac metric overlay iaq&trh buttons', async () => {
          const floorLevelMonitorPage = await buildingLevelMonitorPage.selectFloor(
            new FloorSelector(BUILDING.name, FLOOR_NAME),
          );

          expect(
            await buildingLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.byDeviceButton.isEnabled(),
          ).toBeTruthy();
          expect(
            await buildingLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.bySpaceButton.isEnabled(),
          ).toBeTruthy();

          await step('Floor level: check 9F tab displays in aside tabs', () => {
            expect(floorLevelMonitorPage.aside.asideTabs.containsTab('9 Foundations')).toBeTruthy();
          });

          await floorLevelMonitorPage.selectMapMode('By device');

          let floorMapMenu = await floorLevelMonitorPage.openFloorMenu();
          expect(await floorMapMenu.header.iaqButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.hvacButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.alertsButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.energyButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.occupancyButton.isDisplayed()).toBeTruthy();

          const iaqButtonsByDevice = floorMapMenu.body as NineFIaqMetrics;
          expect(await iaqButtonsByDevice.iaqScoreMetrics.isEnabled()).toBeFalsy();
          expect(await iaqButtonsByDevice.trhScoreMetrics?.isEnabled()).toBeFalsy();

          await floorLevelMonitorPage.selectMapMode('By space');

          floorMapMenu = await floorLevelMonitorPage.openFloorMenu();
          expect(await floorMapMenu.header.iaqButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.hvacButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.alertsButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.energyButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.occupancyButton.isDisplayed()).toBeTruthy();

          await floorMapMenu.clickHvacHeader();

          const hvacButtonsBySpace = floorMapMenu.body as NineFIaqMetrics;
          expect(await hvacButtonsBySpace.iaqScoreMetrics.isEnabled()).toBeFalsy();
          expect(await hvacButtonsBySpace.trhScoreMetrics.isEnabled()).toBeFalsy();

          await floorMapMenu.clickIaqHeader();

          const iaqButtonsBySpace = floorMapMenu.body as NineFIaqMetrics;
          expect(await iaqButtonsBySpace.iaqScoreMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.trhScoreMetrics.isDisplayed()).toBeTruthy();
        });

        await step('Room level: check iaq&hvac metric overlay iaq&trh buttons', async () => {
          const roomLevelMonitorPage = await buildingLevelMonitorPage.selectRoom(
            new RoomSelector(BUILDING.name, FLOOR_NAME, ROOM_NAME),
          );

          await step('Room level: check 9F tab displays in aside tabs', () => {
            expect(roomLevelMonitorPage.aside.asideTabs.containsTab('9 Foundations')).toBeTruthy();
          });

          expect(
            await buildingLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.byDeviceButton.isEnabled(),
          ).toBeTruthy();
          expect(
            await buildingLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.bySpaceButton.isEnabled(),
          ).toBeTruthy();

          await roomLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.selectMapMode('By device');

          let roomMapMenu = await roomLevelMonitorPage.openFloorMenu();
          expect(await roomMapMenu.header.iaqButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.hvacButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.alertsButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.energyButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.occupancyButton.isDisplayed()).toBeTruthy();

          const iaqButtonsByDevice = roomMapMenu.body as NineFIaqMetrics;
          expect(await iaqButtonsByDevice.iaqScoreMetrics.isEnabled()).toBeFalsy();
          expect(await iaqButtonsByDevice.trhScoreMetrics?.isEnabled()).toBeFalsy();

          await roomLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.selectMapMode('By space');

          roomMapMenu = await roomLevelMonitorPage.openFloorMenu();
          expect(await roomMapMenu.header.iaqButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.hvacButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.alertsButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.energyButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.occupancyButton.isDisplayed()).toBeTruthy();

          await roomMapMenu.clickHvacHeader();

          const hvacButtonsBySpace = roomMapMenu.body as NineFIaqMetrics;
          expect(await hvacButtonsBySpace.iaqScoreMetrics.isEnabled()).toBeFalsy();
          expect(await hvacButtonsBySpace.trhScoreMetrics.isEnabled()).toBeFalsy();

          await roomMapMenu.clickIaqHeader();

          const iaqButtonsBySpace = roomMapMenu.body as NineFIaqMetrics;
          expect(await iaqButtonsBySpace.iaqScoreMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.trhScoreMetrics.isDisplayed()).toBeTruthy();
        });
      });
    },
  );

  test(
    'Monitor page displays with Well standard',
    {
      tag: ['@regression', '@ui', '@setIaqStandardAlc'],
    },
    async ({ globalAdminPage, withKnownIssues }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15808', 'ABOUND-15808 - 9F Map Overlays');

      await withKnownIssues(knownIssues).run(async () => {
        const customer = getCustomerForEnv(BUILDING.site.customerName);
        await BuildingStandards.setApiIaqStandard(BuildingStandards.wellStandard, customer);

        const buildingLevelMonitorPage = await openBuildingView(globalAdminPage, {
          buildingName: BUILDING.name,
          featureFlags: {
            monitorNotVisible: false,
          },
        }).then((_) => _.buildingViewSideMenu.openMonitorPage(BuildingStandards.wellStandard));

        await step('Building level: check 9F tab is not displayed in aside tabs', () => {
          expect(buildingLevelMonitorPage.aside.asideTabs.containsTab('9 Foundations')).toBeFalsy();
        });

        await step('Building level: check iaq&hvac metric overlay iaq&trh buttons', async () => {
          expect(
            await buildingLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.byDeviceButton.isEnabled(),
          ).toBeFalsy();
          expect(
            await buildingLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.bySpaceButton.isEnabled(),
          ).toBeTruthy();

          let buildingMapMenu = await buildingLevelMonitorPage.openFloorMenu();
          expect(await buildingMapMenu.header.iaqButton.isDisplayed()).toBeTruthy();
          expect(await buildingMapMenu.header.hvacButton.isDisplayed()).toBeTruthy();
          expect(await buildingMapMenu.header.alertsButton.isDisplayed()).toBeTruthy();
          expect(await buildingMapMenu.header.energyButton.isDisplayed()).toBeTruthy();
          expect(await buildingMapMenu.header.occupancyButton.isDisplayed()).toBeTruthy();
          await buildingMapMenu.clickHvacHeader();
          const hvacButtons = buildingMapMenu.body as WellIaqMetrics;
          expect(await hvacButtons.iaqScoreMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtons.allIaqMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtons.temperatureMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtons.humidityMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtons.tvocsMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtons.co2Metrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtons.pm25Metrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtons.radonMetrics.isDisplayed()).toBeTruthy();

          buildingMapMenu = await buildingMapMenu.clickIaqHeader();

          const iaqButtons = buildingMapMenu.body as WellIaqMetrics;
          expect(await iaqButtons.iaqScoreMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtons.allIaqMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtons.temperatureMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtons.humidityMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtons.tvocsMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtons.co2Metrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtons.pm25Metrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtons.radonMetrics.isDisplayed()).toBeTruthy();
        });

        await step('Floor level: check iaq&hvac metric overlay iaq&trh buttons', async () => {
          const floorLevelMonitorPage = await buildingLevelMonitorPage.selectFloor(
            new FloorSelector(BUILDING.name, FLOOR_NAME),
          );

          expect(
            await buildingLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.byDeviceButton.isEnabled(),
          ).toBeTruthy();
          expect(
            await buildingLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.bySpaceButton.isEnabled(),
          ).toBeTruthy();

          await step('Floor level: check 9F tab is NOT displayed in aside tabs', () => {
            expect(floorLevelMonitorPage.aside.asideTabs.containsTab('9 Foundations')).toBeFalsy();
          });

          await floorLevelMonitorPage.selectMapMode('By device');

          let floorMapMenu = await floorLevelMonitorPage.openFloorMenu();
          expect(await floorMapMenu.header.iaqButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.hvacButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.alertsButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.energyButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.occupancyButton.isDisplayed()).toBeTruthy();

          const iaqButtonsByDevice = floorMapMenu.body as WellIaqMetrics;
          expect(await iaqButtonsByDevice.iaqScoreMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.allIaqMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.temperatureMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.humidityMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.tvocsMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.co2Metrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.pm25Metrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.radonMetrics.isDisplayed()).toBeTruthy();

          await floorLevelMonitorPage.selectMapMode('By space');

          floorMapMenu = await floorLevelMonitorPage.openFloorMenu();
          expect(await floorMapMenu.header.iaqButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.hvacButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.alertsButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.energyButton.isDisplayed()).toBeTruthy();
          expect(await floorMapMenu.header.occupancyButton.isDisplayed()).toBeTruthy();

          await floorMapMenu.clickHvacHeader();

          const hvacButtonsBySpace = floorMapMenu.body as WellIaqMetrics;
          expect(await hvacButtonsBySpace.iaqScoreMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.allIaqMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.temperatureMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.humidityMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.tvocsMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.co2Metrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.pm25Metrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.radonMetrics.isDisplayed()).toBeTruthy();

          await floorMapMenu.clickIaqHeader();

          const iaqButtonsBySpace = floorMapMenu.body as WellIaqMetrics;
          expect(await iaqButtonsBySpace.iaqScoreMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.allIaqMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.temperatureMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.humidityMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.tvocsMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.co2Metrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.pm25Metrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.radonMetrics.isDisplayed()).toBeTruthy();
        });

        await step('Room level: check iaq&hvac metric overlay iaq&trh buttons', async () => {
          const roomLevelMonitorPage = await buildingLevelMonitorPage.selectRoom(
            new RoomSelector(BUILDING.name, FLOOR_NAME, ROOM_NAME),
          );

          await step('Room level: check 9F tab is NOT displayed in aside tabs', () => {
            expect(roomLevelMonitorPage.aside.asideTabs.containsTab('9 Foundations')).toBeFalsy();
          });

          expect(
            await buildingLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.byDeviceButton.isEnabled(),
          ).toBeTruthy();
          expect(
            await buildingLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.bySpaceButton.isEnabled(),
          ).toBeTruthy();

          await roomLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.selectMapMode('By device');

          let roomMapMenu = await roomLevelMonitorPage.openFloorMenu();
          expect(await roomMapMenu.header.iaqButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.hvacButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.alertsButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.energyButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.occupancyButton.isDisplayed()).toBeTruthy();

          const iaqButtonsByDevice = roomMapMenu.body as WellIaqMetrics;
          expect(await iaqButtonsByDevice.iaqScoreMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.allIaqMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.temperatureMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.humidityMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.tvocsMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.co2Metrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.pm25Metrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsByDevice.radonMetrics.isDisplayed()).toBeTruthy();

          await roomLevelMonitorPage.mapOverlayControlledElement.mapOverlayControls.selectMapMode('By space');

          roomMapMenu = await roomLevelMonitorPage.openFloorMenu();
          expect(await roomMapMenu.header.iaqButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.hvacButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.alertsButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.energyButton.isDisplayed()).toBeTruthy();
          expect(await roomMapMenu.header.occupancyButton.isDisplayed()).toBeTruthy();

          await roomMapMenu.clickHvacHeader();

          const hvacButtonsBySpace = roomMapMenu.body as WellIaqMetrics;
          expect(await hvacButtonsBySpace.iaqScoreMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.allIaqMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.temperatureMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.humidityMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.tvocsMetrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.co2Metrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.pm25Metrics.isDisplayed()).toBeTruthy();
          expect(await hvacButtonsBySpace.radonMetrics.isDisplayed()).toBeTruthy();

          await roomMapMenu.clickIaqHeader();

          const iaqButtonsBySpace = roomMapMenu.body as WellIaqMetrics;
          expect(await iaqButtonsBySpace.iaqScoreMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.allIaqMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.temperatureMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.humidityMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.tvocsMetrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.co2Metrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.pm25Metrics.isDisplayed()).toBeTruthy();
          expect(await iaqButtonsBySpace.radonMetrics.isDisplayed()).toBeTruthy();
        });
      });
    },
  );
});
