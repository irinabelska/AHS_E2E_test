import { expect } from '@playwright/test';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { Building, BuildingName, getBuildingForEnv } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/framework/utils/map.utils';
import { SubMetersPage } from '@/tests/playwright/framework/pages/buildingview/settings/meters/submeters/SubMetersPage';
import {
  ByTextMeterFilter,
  ByTypeMeterFilter,
} from '@/tests/playwright/framework/pages/buildingview/settings/meters/MeterFilter';
import {
  getSubMeterSensorForEnv,
  SubMeterSensorDescription,
} from '@/tests/playwright/framework/entities/SubMeterSensor';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';

test.describe(
  'Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Sub Meters', () => {
      interface TestConfig {
        building: Building;
        existingSensor: SubMeterSensorDescription;
      }

      function createTestConfig(
        env: Env,
        sensorId: string,
        buildingId: BuildingName,
        serve: string = buildingId,
      ): TestConfig {
        return {
          building: getBuildingForEnv(env, buildingId),
          existingSensor: getSubMeterSensorForEnv(env, { sensorId: sensorId, serveSpace: serve }),
        };
      }

      const CONFIGS: Map<Env, TestConfig> = new Map<Env, TestConfig>([
        [Env.LOCAL, createTestConfig(Env.LOCAL, '788c15ef-19c6-4478-8c2b-6ef9c7aca907', BuildingName.CIB)],
        [Env.DEV, createTestConfig(Env.DEV, '788c15ef-19c6-4478-8c2b-6ef9c7aca907', BuildingName.CIB)],
        [Env.QA, createTestConfig(Env.QA, '9cb1ed78-7a48-4fd0-90aa-c2d355f55f4c', BuildingName.ALC_NY_MAIN)],
        [
          Env.PRE_PROD,
          createTestConfig(Env.PRE_PROD, '84c9f8cc-4e82-479c-a44a-f5decee41a13', BuildingName.CIB, 'N107 AV / IDF'),
        ],
        [Env.PROD, createTestConfig(Env.PROD, '450ed7c6-2e46-44d7-8532-d01949281036', BuildingName.CAR_CIB)],
      ]);

      const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

      const knownIssues: KnownIssue[] = [];

      test('smoke test', async ({ globalAdminPage, withKnownIssues }) => {
        await withKnownIssues(knownIssues).run(async () => {
          let subMetersPage: SubMetersPage = await openBuildingView(globalAdminPage, {
            buildingName: CONFIG.building.name,
          })
            .then((p) => p.buildingViewSideMenu.openSettingsPage())
            .then((p) => p.settingsSideMenu.openSubMetersPage());

          const visibleMeters = await subMetersPage.getVisibleMeters(10);
          expect(visibleMeters.length).toBeGreaterThan(0);

          subMetersPage = await step('filter meters by device name', async () => {
            subMetersPage = await subMetersPage.filterMeters([ByTextMeterFilter.of(CONFIG.existingSensor.deviceName)]);
            const metersFilteredByName = await subMetersPage.getVisibleMeters(2);

            expect(
              new Set(metersFilteredByName.map((m) => m.deviceName)),
              'expected only sensor with specified device name',
            ).toEqual(new Set([CONFIG.existingSensor.deviceName]));

            return subMetersPage;
          });

          subMetersPage = await step('filter meters by meter type', async () => {
            subMetersPage = await subMetersPage.filterMeters([ByTypeMeterFilter.of(CONFIG.existingSensor.meterType)]);
            const metersFilteredByName = await subMetersPage.getVisibleMeters(5);

            expect(new Set(metersFilteredByName.map((m) => m.type))).toEqual(
              new Set([CONFIG.existingSensor.meterType]),
            );

            return subMetersPage;
          });

          await step('filter meters by non existing sensor name', async () => {
            subMetersPage = await subMetersPage.filterMeters([ByTextMeterFilter.of('NON-EXISTING-SENSOR-NAME')]);
            const metersFilteredByName = await subMetersPage.getVisibleMeters(2);

            expect(metersFilteredByName).toEqual([]);
          });
        });
      });
    });
  },
);
