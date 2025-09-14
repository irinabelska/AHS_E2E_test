import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { TemperaturePreferenceUnit } from '@/framework/constants/preferenceUnits';
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
  DeviceTooltip,
  DeviceToolTipMetrics,
} from '@/tests/playwright/framework/pages/buildingview/device/DeviceTooltip';
import { LiveIaqMetrics } from '@/tests/playwright/framework/pages/buildingview/device/monitor/iaq/LiveIaqMetrics';
import { IaqPerformanceDetails } from '@/tests/playwright/framework/pages/buildingview/device/monitor/aside/device/performance/IaqDevicePerformanceSummary';
import { HvacAhuPerformanceDetails } from '@/tests/playwright/framework/pages/buildingview/device/monitor/aside/device/performance/HvacAhuDevicePerformanceSummary';
import { BuildingSelector, FloorSelector, RoomSelector } from '@/tests/playwright/framework/entities/LocationSelector';
import { HvacVavPerformanceDetails } from '@/tests/playwright/framework/pages/buildingview/device/monitor/aside/device/performance/HvacVavDevicePerformanceSummary';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { BuildingStandards } from '@/tests/playwright/framework/entities/BuildingStandards';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import {
  BuildingSpaceMonitorAside,
  FloorOrRoomSpaceMonitorAside,
} from '@/tests/playwright/framework/pages/buildingview/device/monitor/aside/SpaceMonitorAside';
import { UsersActions } from '@/framework/apiActions/UsersActions';

test.describe(
  'Monitor',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    interface TestConfig {
      building: Building;
      floorName: string;
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
    const HVAC_AHU_DEVICE_NAME = CONFIG.hvacAhuDeviceName;
    const HVAC_VAV_DEVICE_NAME = CONFIG.hvacVavDeviceName;
    const IAQ_DEVICE_NAME = CONFIG.iaqDeviceName;
    const DEVICE_ID_TO_HOVER_OVER = CONFIG.deviceToHoverOverId;

    interface TestConfigOccupancy {
      building: Building;
      floorName: string;
      roomName: string;
    }

    interface UserUnitPreferences {
      temperature: TemperaturePreferenceUnit;
    }

    const validateTooltipMetrics = (
      tooltipMetrics: DeviceToolTipMetrics,
      unitPreferences: UserUnitPreferences,
    ): void => {
      if (tooltipMetrics.temperature) {
        expect(tooltipMetrics.temperature.unit).toEqual(unitPreferences.temperature);
      }
    };

    const validateLiveIaqTemperatureUnit = (
      liveIaqMetrics: LiveIaqMetrics,
      unitPreferences: UserUnitPreferences,
    ): void => {
      const temperature = liveIaqMetrics.temperature;

      if (temperature === undefined) {
        return;
      }

      if (temperature.high) {
        expect(temperature.high.unit).toEqual(unitPreferences.temperature);
      }

      if (temperature.low) {
        expect(temperature.low.unit).toEqual(unitPreferences.temperature);
      }
    };

    const validateIaqPerformanceDetails = (
      iaqPerformanceDetails: IaqPerformanceDetails,
      unitPreferences: UserUnitPreferences,
    ): void => {
      const iaqPerfDetailsTemperature = iaqPerformanceDetails.temperature;

      if (iaqPerfDetailsTemperature) {
        expect(iaqPerfDetailsTemperature.unit).toEqual(unitPreferences.temperature);
      }
    };

    const validateHvacAuPerformanceDetails = (
      hvacPerfDetails: HvacAhuPerformanceDetails,
      unitPreferences: UserUnitPreferences,
    ): void => {
      if (hvacPerfDetails.airTemperature?.supplyMeasurement) {
        expect(hvacPerfDetails.airTemperature.supplyMeasurement.unit).toEqual(unitPreferences.temperature);
      }

      if (hvacPerfDetails.airTemperature?.returnMeasurement) {
        expect(hvacPerfDetails.airTemperature.returnMeasurement.unit).toEqual(unitPreferences.temperature);
      }

      if (hvacPerfDetails.roomTemperature) {
        expect(hvacPerfDetails.roomTemperature.unit).toEqual(unitPreferences.temperature);
      }
    };

    const validateHvacVavPerformanceDetails = (
      hvacPerfDetails: HvacVavPerformanceDetails,
      unitPreferences: UserUnitPreferences,
    ): void => {
      if (hvacPerfDetails.roomTemperature) {
        expect(hvacPerfDetails.roomTemperature.unit).toEqual(unitPreferences.temperature);
      }
    };

    const knownIssues: KnownIssue[] = [];

    const getAsideOccupancyTabWithRows = async (aside: BuildingSpaceMonitorAside | FloorOrRoomSpaceMonitorAside) => {
      let asideOccupancy;

      try {
        asideOccupancy = await aside.openOccupancyTabWithRows();
      } catch (error) {
        const errorMessage = (error as Error).message;

        if (!asideOccupancy && errorMessage.includes('No occupancy data')) {
          test.skip(true, errorMessage);
        } else {
          throw error;
        }
      }

      if (!asideOccupancy) {
        throw new Error('asideOccupancy element has not been found');
      }

      return asideOccupancy;
    };

    const getAsideOccupancyTabWithChart = async (aside: BuildingSpaceMonitorAside | FloorOrRoomSpaceMonitorAside) => {
      let asideOccupancy;

      try {
        asideOccupancy = await aside.openOccupancyTabWithChart();
      } catch (error) {
        const errorMessage = (error as Error).message;

        if (!asideOccupancy && errorMessage.includes('No occupancy data')) {
          test.skip(true, errorMessage);
        } else {
          throw error;
        }
      }

      if (!asideOccupancy) {
        throw new Error('asideOccupancy element has not been found');
      }

      return asideOccupancy;
    };

    test('Smoke test', async ({ globalAdminPage, withKnownIssues }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6071', 'ABOUND-6071');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6071', 'ABOUND-6073');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-10734', 'ABOUND-10734');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15808', 'ABOUND-15808 - 9F Map Overlays');

      await withKnownIssues(knownIssues).run(async () => {
        const buildingViewPage = await openBuildingView(globalAdminPage, {
          buildingName: BUILDING.name,
          featureFlags: {
            monitorNotVisible: false,
          },
        });

        const selectedIaqStandard = await BuildingStandards.getApiSelectedIaqStandard(
          getCustomerForEnv(BUILDING.site.customerName),
        );

        let buildingLevelMonitorPage = await buildingViewPage.buildingViewSideMenu.openMonitorPage(selectedIaqStandard);

        buildingLevelMonitorPage = await step('Building level: check iaq&hvac metric overlay', async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6530', 'ABOUND-6530');

          await buildingLevelMonitorPage
            .openFloorMenu()
            .then((m) => m.clickHvacHeader())
            .then((_) => _.clickIaqHeader());

          return buildingLevelMonitorPage.closeFloorMenu();
        });

        buildingLevelMonitorPage = await step('Building level: check aside alerts tab', async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6530', 'ABOUND-6530');
          const asideAlerts = await buildingLevelMonitorPage.aside.openAlertsTab();

          expect(asideAlerts.summary.total).toBeGreaterThanOrEqual(0);
          expect(asideAlerts.summary.caution).toBeGreaterThanOrEqual(0);
          expect(asideAlerts.summary.critical).toBeGreaterThanOrEqual(0);
          expect(asideAlerts.summary.caution + asideAlerts.summary.critical).toEqual(asideAlerts.summary.total);

          if (asideAlerts.summary.total > 0) {
            if (!asideAlerts.recentAlerts) {
              throw Error('since alerts exist I should be able to see recent alerts');
            }

            expect(asideAlerts.recentAlerts.count).toBeGreaterThanOrEqual(0);
            const alerts = await asideAlerts.recentAlerts.getAlerts(1);

            expect(alerts).toBeTruthy();
          }

          return buildingLevelMonitorPage;
        });

        buildingLevelMonitorPage = await step('Building level: aside check energy tab', async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6533', 'ABOUND-6533');

          const asideEnergy = await buildingLevelMonitorPage.aside.openEnergyTab();

          expect(asideEnergy).toBeTruthy();
          expect(asideEnergy.demandAndConsumption).toBeTruthy();
          expect(asideEnergy.netEnergySupply).toBeTruthy();
          expect(asideEnergy.energyChart).toBeTruthy();
          expect(asideEnergy.energyPanelHeader).toBeTruthy();

          return buildingLevelMonitorPage;
        });

        let floorLevelMonitorPage = await step('Floor level: check iaq&hvac metric overlay', async () => {
          const floorLevelMonitorPage = await buildingLevelMonitorPage.selectFloor(
            new FloorSelector(BUILDING.name, FLOOR_NAME),
          );
          await floorLevelMonitorPage
            .openFloorMenu()
            .then((m) => m.clickHvacHeader())
            .then((_) => _.clickIaqHeader());

          return floorLevelMonitorPage.closeFloorMenu();
        });

        const unitPreferences = await UsersActions.getUnitPreferences(globalAdminPage.user);

        floorLevelMonitorPage = await step('Floor level map: check device tooltip metrics units', async () => {
          const deviceTooltip: DeviceTooltip =
            await floorLevelMonitorPage.hooverOverDeviceOnMap(DEVICE_ID_TO_HOVER_OVER);

          const tooltipMetrics = deviceTooltip.getMetrics();

          validateTooltipMetrics(tooltipMetrics, unitPreferences);

          return floorLevelMonitorPage;
        });

        floorLevelMonitorPage = await step('Floor level: check aside quick overview & iaq tabs', async () => {
          const quickViewTab = await floorLevelMonitorPage.aside.openQuickViewTab();
          expect(quickViewTab).toBeTruthy();

          const liveIaqMetrics = quickViewTab.getLiveIaqMetrics();
          validateLiveIaqTemperatureUnit(liveIaqMetrics, unitPreferences);

          const iaqTab = await floorLevelMonitorPage.aside.openIaqTab();
          expect(iaqTab).toBeTruthy();

          return floorLevelMonitorPage;
        });

        await step('Building level: check iaq&ahu&vav device details', async () => {
          const buildingLevelMonitorPage = await floorLevelMonitorPage.selectBuilding(
            new BuildingSelector(BUILDING.name),
          );
          const monitorPageWithIaqDeviceAside = await buildingLevelMonitorPage.selectIaqDevice(IAQ_DEVICE_NAME);
          const iaqPerfDetails = monitorPageWithIaqDeviceAside.aside.performanceSummary.getPerformanceDetails();
          validateIaqPerformanceDetails(iaqPerfDetails, unitPreferences);

          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6108', 'ABOUND-6108');
          const monitorPageWithHvacAhuDeviceAside =
            await monitorPageWithIaqDeviceAside.selectHvacAhuDevice(HVAC_AHU_DEVICE_NAME);
          const hvacAhuPerfDetails = monitorPageWithHvacAhuDeviceAside.aside.performanceSummary.getPerformanceDetails();
          validateHvacAuPerformanceDetails(hvacAhuPerfDetails, unitPreferences);

          if (HVAC_VAV_DEVICE_NAME) {
            allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6111', 'ABOUND-6111');
            allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6112', 'ABOUND-6112');
            allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6114', 'ABOUND-6114');
            allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6115', 'ABOUND-6115');
            const monitorPageWithHvacVavDeviceAside =
              await monitorPageWithIaqDeviceAside.selectHvacVavDevice(HVAC_VAV_DEVICE_NAME);
            const hvacVavPerfDetails =
              monitorPageWithHvacVavDeviceAside.aside.performanceSummary.getPerformanceDetails();
            validateHvacVavPerformanceDetails(hvacVavPerfDetails, unitPreferences);
            expect(monitorPageWithHvacVavDeviceAside.aside.statusSummary).toBeTruthy();
          }
        });
      });
    });

    test('Smoke test: Occupancy', async ({ globalAdminPage, withKnownIssues }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6074', 'ABOUND-6074');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-19685', 'ABOUND-19685');

      test.skip(!Env.PROD.includes(getCurrentEnv()), 'test is intended only for prod env');
      const CONFIGS_OCCUPANCY: Map<Env, TestConfigOccupancy> = new Map<Env, TestConfigOccupancy>([
        [
          Env.PROD,
          {
            building: getBuildingForProdEnv(BuildingName.CAR_CIB),
            floorName: 'Level 05',
            roomName: 'N530 Open Office',
          },
        ],
      ]);

      const CONFIG_OCCUPANCY = forceGetFromMap(CONFIGS_OCCUPANCY, getCurrentEnv());

      const BUILDING_OCCUPANCY = CONFIG_OCCUPANCY.building;
      const FLOOR_NAME_OCCUPANCY = CONFIG_OCCUPANCY.floorName;
      const ROOM_NAME_OCCUPANCY = CONFIG_OCCUPANCY.roomName;

      await step('Occupancy', async () => {
        await withKnownIssues(knownIssues).run(async () => {
          const buildingViewPage = await openBuildingView(globalAdminPage, {
            buildingName: BUILDING_OCCUPANCY.name,
            featureFlags: {
              monitorNotVisible: false,
            },
          });

          const selectedIaqStandard = await BuildingStandards.getApiSelectedIaqStandard(
            getCustomerForEnv(BUILDING_OCCUPANCY.site.customerName),
          );

          let buildingLevelMonitorPage =
            await buildingViewPage.buildingViewSideMenu.openMonitorPage(selectedIaqStandard);

          buildingLevelMonitorPage = await step('Building level: check aside occupancy tab', async () => {
            const asideOccupancy = await getAsideOccupancyTabWithChart(buildingLevelMonitorPage.aside);

            expect(asideOccupancy).toBeTruthy();

            const occupancyCapacityItems = asideOccupancy.occupancyCapacity.occupancyCapacityItems;

            expect(occupancyCapacityItems).toBeTruthy();
            expect(occupancyCapacityItems.length).toBeGreaterThan(0);
            expect(asideOccupancy.occupancySummaryHeader).toBeTruthy();
            expect(asideOccupancy.occupancyChart).toBeTruthy();

            return buildingLevelMonitorPage;
          });

          await step('Floor level: check aside occupancy tab', async () => {
            const floorLevelMonitorPage = await buildingLevelMonitorPage.selectFloor(
              new FloorSelector(BUILDING_OCCUPANCY.name, FLOOR_NAME_OCCUPANCY),
            );

            const asideOccupancy = await getAsideOccupancyTabWithRows(floorLevelMonitorPage.aside);
            const occupancyList = await asideOccupancy.occupancyList.getElements(5);

            expect(occupancyList).toBeTruthy();
            expect(occupancyList.length).toBeGreaterThan(0);

            return floorLevelMonitorPage;
          });

          await step('Room level: check aside occupancy tab', async () => {
            const roomLevelMonitorPage = await buildingLevelMonitorPage.selectRoom(
              new RoomSelector(BUILDING_OCCUPANCY.name, FLOOR_NAME_OCCUPANCY, ROOM_NAME_OCCUPANCY),
            );

            const asideOccupancy = await getAsideOccupancyTabWithChart(roomLevelMonitorPage.aside);
            const occupancyCapacityItems = asideOccupancy.occupancyCapacity.occupancyCapacityItems;

            expect(occupancyCapacityItems).toBeTruthy();
            expect(occupancyCapacityItems.length).toBeGreaterThan(0);
            expect(asideOccupancy.occupancySummaryHeader).toBeTruthy();
            expect(asideOccupancy.occupancyChart).toBeTruthy();
          });
        });
      });
    });

    test('Smoke test: Occupancy (Derived)', async ({ globalAdminPage, withKnownIssues }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6074', 'ABOUND-6074');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-19685', 'ABOUND-19685');

      test.skip(!Env.PROD.includes(getCurrentEnv()), 'test is intended only for prod env');

      const CONFIGS_OCCUPANCY_DERIVED: Map<Env, TestConfigOccupancy> = new Map<Env, TestConfigOccupancy>([
        [
          Env.PROD,
          {
            building: getBuildingForProdEnv(BuildingName.CAR_DIGITAL_HUB),
            floorName: 'Floor 9',
            roomName: 'Avengers Huddle Room - 931',
          },
        ],
      ]);

      const CONFIG_OCCUPANCY_DERIVED = forceGetFromMap(CONFIGS_OCCUPANCY_DERIVED, getCurrentEnv());

      const BUILDING_OCCUPANCY_DERIVED = CONFIG_OCCUPANCY_DERIVED.building;
      const FLOOR_NAME_OCCUPANCY_DERIVED = CONFIG_OCCUPANCY_DERIVED.floorName;
      const ROOM_NAME_OCCUPANCY_DERIVED = CONFIG_OCCUPANCY_DERIVED.roomName;

      await step('Occupancy (Derived)', async () => {
        await withKnownIssues(knownIssues).run(async () => {
          const buildingViewPage = await openBuildingView(globalAdminPage, {
            buildingName: BUILDING_OCCUPANCY_DERIVED.name,
            featureFlags: {
              monitorNotVisible: false,
            },
          });

          const selectedIaqStandard = await BuildingStandards.getApiSelectedIaqStandard(
            getCustomerForEnv(BUILDING_OCCUPANCY_DERIVED.site.customerName),
          );

          let buildingLevelMonitorPage =
            await buildingViewPage.buildingViewSideMenu.openMonitorPage(selectedIaqStandard);

          buildingLevelMonitorPage = await step('Building level: check aside occupancy (derived) tab', async () => {
            const asideOccupancy = await getAsideOccupancyTabWithRows(buildingLevelMonitorPage.aside);

            expect(asideOccupancy).toBeTruthy();

            const occupancyList = await asideOccupancy.occupancyList.getElements(5);

            expect(occupancyList).toBeTruthy();
            expect(occupancyList.length).toBeGreaterThan(0);

            return buildingLevelMonitorPage;
          });

          await step('Floor level: check aside occupancy (derived) tab', async () => {
            const floorLevelMonitorPage = await buildingLevelMonitorPage.selectFloor(
              new FloorSelector(BUILDING_OCCUPANCY_DERIVED.name, FLOOR_NAME_OCCUPANCY_DERIVED),
            );

            const asideOccupancy = await getAsideOccupancyTabWithRows(floorLevelMonitorPage.aside);
            const occupancyTabElements = await asideOccupancy.occupancyList.getElements(5);

            expect(occupancyTabElements).toBeTruthy();
            expect(occupancyTabElements.length).toBeGreaterThan(0);

            return floorLevelMonitorPage;
          });

          await step('Room level: check aside occupancy (derived) tab', async () => {
            const roomLevelMonitorPage = await buildingLevelMonitorPage.selectRoom(
              new RoomSelector(
                BUILDING_OCCUPANCY_DERIVED.name,
                FLOOR_NAME_OCCUPANCY_DERIVED,
                ROOM_NAME_OCCUPANCY_DERIVED,
              ),
            );

            const asideOccupancy = await getAsideOccupancyTabWithChart(roomLevelMonitorPage.aside);
            const occupancyCapacityItems = asideOccupancy.occupancyCapacity.occupancyCapacityItems;

            expect(occupancyCapacityItems).toBeTruthy();
            expect(occupancyCapacityItems.length).toBeGreaterThan(0);
            expect(asideOccupancy.occupancySummaryHeader).toBeTruthy();
            expect(asideOccupancy.occupancyChart).toBeTruthy();
          });
        });
      });
    });
  },
);
