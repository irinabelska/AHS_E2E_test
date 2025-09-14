import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import { Building, BuildingName } from '@/tests/playwright/framework/entities/Buildings';
import { ChartDuration } from '@/tests/playwright/framework/types/chart';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { DashboardPageValidator } from '@/tests/playwright/framework/pages/buildingview/dashboard/DashboardPageValidator';
import {
  AboundDashboardPage,
  isAboundDashboardPage,
} from '@/tests/playwright/framework/pages/buildingview/dashboard/AboundDashboardPage';

test.describe(
  'Dashboard',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    interface TestConfig {
      buildingWithAlarms: BuildingName;
      buildingWithoutAlarms: BuildingName;
    }

    const CONFIGS: Map<Env, TestConfig> = new Map<Env, TestConfig>([
      [Env.DEV, { buildingWithAlarms: BuildingName.CIB, buildingWithoutAlarms: BuildingName.PARKING_GARAGE }],
      [Env.LOCAL, { buildingWithAlarms: BuildingName.CIB, buildingWithoutAlarms: BuildingName.PARKING_GARAGE }],
      [Env.QA, { buildingWithAlarms: BuildingName.CIB, buildingWithoutAlarms: BuildingName.PARKING_GARAGE }],
      [Env.PRE_PROD, { buildingWithAlarms: BuildingName.CIB, buildingWithoutAlarms: BuildingName.CAR_CIB }],
      //prod buildingWithAlarms: BuildingName.CAR_CIB has no alarms 12 July 24
      [Env.PROD, { buildingWithAlarms: BuildingName.CAR_CIB, buildingWithoutAlarms: BuildingName.PARKING_GARAGE }],
    ]);

    const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());
    const dashboardValidator: DashboardPageValidator = {
      async validateDbrDashboardPage(): Promise<void> {
        // no additional validation for now
      },
      async validateAboundDashboardPage(dashboardPage: AboundDashboardPage): Promise<void> {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6075', 'ABOUND-6075');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6084', 'ABOUND-6084');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6083', 'ABOUND-6083');

        const testBuilding = Building.get(CONFIG.buildingWithAlarms);

        const liveIaq = dashboardPage.liveIaqSummary;

        expect(await liveIaq.getRoomsCount()).toEqual(testBuilding?.monitoredRooms);
        await liveIaq.switchChartDuration(ChartDuration.DAY);
        expect(await liveIaq.getActiveChartDuration()).toEqual(ChartDuration.DAY);

        const occupancy = dashboardPage.occupancySummary;
        await occupancy.switchChartDuration(ChartDuration.WEEK);
        expect(await occupancy.getActiveChartDuration()).toEqual(ChartDuration.WEEK);

        const alarms = await dashboardPage.alarms.getAlarms(1);

        if (alarms.length !== 0) {
          await alarms[0].click();
          const firstAlarm = alarms[0].description;
          const alarmDetails = await dashboardPage.alarms.getAlarmDetails();

          expect(firstAlarm.header).toEqual(alarmDetails.description.header);
          expect(firstAlarm.details).toEqual(alarmDetails.description.details);
          expect(firstAlarm.alarmStartDate).toEqual(alarmDetails.description.alarmStartDate);
          expect(firstAlarm.criticality).toEqual(alarmDetails.description.criticality);
          expect(firstAlarm.associatedAsset).toEqual(alarmDetails.description.associatedAsset);
          expect(alarmDetails.expandedDetails.alarmId?.length).toBeGreaterThan(0);
          expect(alarmDetails.expandedDetails.alarmDuration?.length).toBeGreaterThan(0);
        }
      },
    };

    test('dashboard components are correctly loaded', async ({ globalAdminPage }) => {
      await openBuildingView(globalAdminPage, { buildingName: CONFIG.buildingWithAlarms })
        .then((_) => _.buildingViewSideMenu.openDashboardPage())
        .then((_) => _.validate(dashboardValidator));
    });

    test('Verify that alarms or empty message should be displayed in the Priority Alert section', async ({
      globalAdminPage,
    }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-6084', 'ABOUND-6084');

      const dashboardPage = await openBuildingView(globalAdminPage, { buildingName: CONFIG.buildingWithAlarms }).then(
        (_) => _.buildingViewSideMenu.openDashboardPage(),
      );

      if (isAboundDashboardPage(dashboardPage)) {
        expect(await dashboardPage.alarms.getAlarms(1)).toBeTruthy();
      } else {
        test.skip(true, 'Dbr dashboard page loaded');
      }
    });
  },
);