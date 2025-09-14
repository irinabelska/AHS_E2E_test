import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { Building, BuildingName, getBuildingForEnv } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/framework/utils/map.utils';
import { SubMetersPage } from '@/tests/playwright/framework/pages/buildingview/settings/meters/submeters/SubMetersPage';
import { ByTextMeterFilter } from '@/tests/playwright/framework/pages/buildingview/settings/meters/MeterFilter';
import {
  getSubMeterSensorForEnv,
  SubMeterSensorDescription,
} from '@/tests/playwright/framework/entities/SubMeterSensor';
import {
  CreateAggregateSensorRequest,
  SensorToAggregate,
} from '@/tests/playwright/framework/pages/buildingview/settings/meters/submeters/CreateAggregateSensorRequest';
import { randomString } from '@/tests/playwright/framework/utils/random.utils';
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
        sensor_1: SubMeterSensorDescription;
        sensor_2: SubMeterSensorDescription;
      }

      function createConfig(
        env: Env,
        sensorId1: string,
        sensorId2: string,
        buildingId: BuildingName,
        serveSpace: string = buildingId,
      ): TestConfig {
        return {
          building: getBuildingForEnv(env, buildingId),
          sensor_1: getSubMeterSensorForEnv(env, { sensorId: sensorId1, serveSpace: serveSpace }),
          sensor_2: getSubMeterSensorForEnv(env, { sensorId: sensorId2, serveSpace: serveSpace }),
        };
      }

      const CONFIGS: Map<Env, TestConfig> = new Map<Env, TestConfig>([
        [
          Env.LOCAL,
          createConfig(
            Env.LOCAL,
            '788c15ef-19c6-4478-8c2b-6ef9c7aca907',
            'ff3ca590-16b2-4bd2-832c-7be0d163fff4',
            BuildingName.CIB,
          ),
        ],
        [
          Env.DEV,
          createConfig(
            Env.DEV,
            '788c15ef-19c6-4478-8c2b-6ef9c7aca907',
            'ff3ca590-16b2-4bd2-832c-7be0d163fff4',
            BuildingName.CIB,
          ),
        ],
        [
          Env.QA,
          createConfig(
            Env.QA,
            '9cb1ed78-7a48-4fd0-90aa-c2d355f55f4c',
            '77901d00-5e8c-4a01-be1e-5697d6bb34b6',
            BuildingName.ALC_NY_MAIN,
          ),
        ],
        [
          Env.PRE_PROD,
          createConfig(
            Env.PRE_PROD,
            '450ed7c6-2e46-44d7-8532-d01949281036',
            '0d8e06b8-dd5a-4221-997c-b090676c6a3d',
            BuildingName.CIB,
          ),
        ],
      ]);

      const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

      const knownIssues: KnownIssue[] = [];

      test('aggregate meters crud operations', async ({ globalAdminPage, withKnownIssues }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9475', 'ABOUND-9475');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9478', 'ABOUND-9478');
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9422', 'ABOUND-9422');

        await withKnownIssues(knownIssues).run(async () => {
          let subMetersPage: SubMetersPage = await openBuildingView(globalAdminPage, {
            buildingName: CONFIG.building.name,
            featureFlags: { aggregateMetersAvailable: true },
          })
            .then((p) => p.buildingViewSideMenu.openSettingsPage())
            .then((p) => p.settingsSideMenu.openSubMetersPage());

          const createAggregateSensorRequest = new CreateAggregateSensorRequest(`e2e-${randomString()}-name`, [
            SensorToAggregate.from('plus', CONFIG.sensor_1),
            SensorToAggregate.from('minus', CONFIG.sensor_2),
          ]);
          const updatedName = `${createAggregateSensorRequest.name}-updated`;

          subMetersPage = await step('create aggregate meter', async () => {
            subMetersPage = await subMetersPage.createAggregateMeter(createAggregateSensorRequest);
            await subMetersPage.filterMeters([ByTextMeterFilter.of(createAggregateSensorRequest.name)]);
            const metersFilteredByName = await subMetersPage.getVisibleMeters(2);

            expect(metersFilteredByName.length).toEqual(1);
            expect(metersFilteredByName[0].isAggregate).toBeTruthy();
            expect(metersFilteredByName[0].displayName).toEqual(createAggregateSensorRequest.name);

            return subMetersPage;
          });

          subMetersPage = await step('update aggregate meter', async () => {
            const createOrEditAggregateSensorModal = await subMetersPage.updateFirstAggregateMeter();
            const updateModal = await createOrEditAggregateSensorModal
              .setMeterName(updatedName)
              .then((m) => m.remove(CONFIG.sensor_1.id.sensorId))
              .then((m) => m.addMeter(CONFIG.sensor_1.deviceName));
            const sensorToAggregates = await updateModal.getSensorsToAggregate();

            expect(sensorToAggregates).toEqual([
              SensorToAggregate.from('plus', CONFIG.sensor_2),
              SensorToAggregate.from('plus', CONFIG.sensor_1),
            ]);
            subMetersPage = await updateModal
              .clickCreateOrUpdate()
              .then((p) => p.filterMeters([ByTextMeterFilter.of(updatedName)]));
            const visibleMeters = await subMetersPage.getVisibleMeters(2);

            expect(visibleMeters.length, `expected one meter, meters=${JSON.stringify(visibleMeters)}`).toEqual(1);

            return subMetersPage;
          });

          subMetersPage = await step('delete found aggregate meter', async () => {
            subMetersPage = await subMetersPage
              .deleteFirstMeter()
              .then((p) => p.filterMeters([ByTextMeterFilter.of(updatedName)]));

            const visibleMeters = await subMetersPage.getVisibleMeters(1);
            expect(visibleMeters.length).toEqual(0);

            return subMetersPage;
          });
        });
      });
    });
  },
);
