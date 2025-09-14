import { expect } from '@playwright/test';

import { test } from '@/tests/playwright/framework/TestConfig';
import { openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import {
  Building,
  BuildingName,
  getBuildingForDevEnv,
  getBuildingForPreProdEnv,
  getBuildingForProdEnv,
  getBuildingForQaEnv,
} from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { BuildingSchedulesPage } from '@/tests/playwright/framework/pages/portfolioview/adminsettings/buildingSchedules/BuildingSchedulesPage';
import { parseTimeString } from '@/tests/playwright/framework/pages/portfolioview/adminsettings/buildingSchedules/ParseDateTimeHelper';
import { buildingStatus } from '@/tests/playwright/framework/pages/portfolioview/adminsettings/buildingSchedules/BuildingScheduleTable';

interface TestConfig {
  building: Building;
}

const CONFIGS: Map<Env, TestConfig> = new Map<Env, TestConfig>([
  [Env.LOCAL, { building: getBuildingForDevEnv(BuildingName.CIB) }],
  [Env.DEV, { building: getBuildingForDevEnv(BuildingName.CIB) }],
  [Env.QA, { building: getBuildingForQaEnv(BuildingName.PARKING_GARAGE) }],
  [Env.PRE_PROD, { building: getBuildingForPreProdEnv(BuildingName.CAR_KENNESAW_OFFICE) }],
  [Env.PROD, { building: getBuildingForProdEnv(BuildingName.CAR_CIB) }],
]);

const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

test.describe(
  'Admin Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () =>
    test.describe('Building Schedules', () => {
      test(`Building Schedules page is displayed in portfolio view`, async ({ globalAdminPage }) => {
        const expectedBusinessHoursTableValues = {
          monday: {
            status: buildingStatus.OPEN.booleanValue,
            opensAt: parseTimeString('09:00'),
            closesAt: parseTimeString('17:00'),
          },
          tuesday: {
            status: buildingStatus.OPEN.booleanValue,
            opensAt: parseTimeString('09:00'),
            closesAt: parseTimeString('17:00'),
          },
          wednesday: {
            status: buildingStatus.OPEN.booleanValue,
            opensAt: parseTimeString('09:00'),
            closesAt: parseTimeString('17:00'),
          },
          thursday: {
            status: buildingStatus.OPEN.booleanValue,
            opensAt: parseTimeString('09:00'),
            closesAt: parseTimeString('16:00'),
          },
          friday: { status: buildingStatus.CLOSED.booleanValue, opensAt: undefined, closesAt: undefined },
          saturday: { status: buildingStatus.CLOSED.booleanValue, opensAt: undefined, closesAt: undefined },
          sunday: { status: buildingStatus.CLOSED.booleanValue, opensAt: undefined, closesAt: undefined },
        };

        const expectedNineFTableValues = {
          monday: {
            status: buildingStatus.OPEN.booleanValue,
            opensAt: parseTimeString('09:00'),
            closesAt: parseTimeString('17:00'),
          },
          tuesday: {
            status: buildingStatus.OPEN.booleanValue,
            opensAt: parseTimeString('09:00'),
            closesAt: parseTimeString('17:00'),
          },
          wednesday: {
            status: buildingStatus.OPEN.booleanValue,
            opensAt: parseTimeString('09:00'),
            closesAt: parseTimeString('17:00'),
          },
          thursday: {
            status: buildingStatus.OPEN.booleanValue,
            opensAt: parseTimeString('09:00'),
            closesAt: parseTimeString('17:00'),
          },
          friday: { status: buildingStatus.CLOSED.booleanValue, opensAt: undefined, closesAt: undefined },
          saturday: { status: buildingStatus.CLOSED.booleanValue, opensAt: undefined, closesAt: undefined },
          sunday: { status: buildingStatus.CLOSED.booleanValue, opensAt: undefined, closesAt: undefined },
        };

        const buildingSchedulesPage: BuildingSchedulesPage = await openPortfolioView(globalAdminPage).then((_) =>
          _.topBar
            .selectCustomer(CONFIG.building.site.customerName)
            .then((p) => p.portfolioViewSideMenu.openPvAdminSettings(p, globalAdminPage))
            .then((p) => p.settingsTabBar.openBuildingSchedulesStandardsPage(globalAdminPage)),
        );

        const businessHoursTableValues = await buildingSchedulesPage.businessHoursTable?.getContent();
        const nineFTableValues = await buildingSchedulesPage.nineFBusinessHoursTable?.getContent();

        expect(businessHoursTableValues).toEqual(expectedBusinessHoursTableValues);
        expect(nineFTableValues).toEqual(expectedNineFTableValues);
      });
    }),
);
