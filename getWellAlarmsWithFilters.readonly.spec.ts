import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { AboundAlarm, AlertCenterDeviceType, AlertCenterStatus } from '@/framework/constants/preferenceUnits';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import { allowedMetricsForDeviceType } from '@/tests/playwright/tests/api/abound-alarm-gql/alarms/alarm.type';
import { getAllWellAlarmsWithFilters } from '@/tests/playwright/tests/api/abound-alarm-gql/alarms/wellAlarms.step';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

test.describe(
  'getAllWellAlarmsWithFilters',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.LOCAL, BuildingName.CIB],
      [Env.DEV, BuildingName.CIB],
      [Env.QA, BuildingName.ALC_NY_MAIN],
      [Env.PRE_PROD, BuildingName.CIB],
      [Env.PROD, BuildingName.PARKING_GARAGE],
    ]);

    const building = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv()));
    const customerId = getCustomerForEnv(building.site.customerName, getCurrentEnv()).id;
    const buildingAboundId = building.id;

    for (const deviceType of Object.values(AlertCenterDeviceType)) {
      test(`getAllWellAlarmsWithFilters(deviceType=${deviceType})`, async ({ gqlRunnerByGlobalAdmin }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-11772', 'test case: ABOUND-11772');

        const alarms = await getAllWellAlarmsWithFilters(
          gqlRunnerByGlobalAdmin,
          buildingAboundId,
          AlertCenterStatus.ALL,
          deviceType as AlertCenterDeviceType,
          customerId,
        );

        test.skip(alarms.length === 0, 'no alarms to test');

        alarms.forEach((alarm: AboundAlarm) => {
          expect(allowedMetricsForDeviceType[deviceType]).toContain(alarm.type);
        });
      });
    }

    function validateAlertStatus(alarm: AboundAlarm, alertStatus: AlertCenterStatus) {
      // if alarm is old enough to not qualify as NEW but not yet RESOLVED, label is null
      if (
        (alertStatus === AlertCenterStatus.NEW && alarm.label !== null) ||
        alertStatus !== AlertCenterStatus.RESOLVED
      ) {
        expect(alarm.label, `offending alarm.id=${alarm.id}`).toBe(alertStatus);
      }
    }

    for (const alertStatus of [AlertCenterStatus.NEW, AlertCenterStatus.RESOLVED]) {
      test(`getAllWellAlarmsWithFilters(alertStatus=${alertStatus})`, async ({ gqlRunnerByGlobalAdmin }) => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-11772', 'test case: ABOUND-11772');

        const alarms = await getAllWellAlarmsWithFilters(
          gqlRunnerByGlobalAdmin,
          buildingAboundId,
          alertStatus,
          AlertCenterDeviceType.All,
          customerId,
        );

        test.skip(alarms.length === 0, 'no alarms to test');

        alarms.forEach((alarm: AboundAlarm) => {
          validateAlertStatus(alarm, alertStatus);
        });
      });
    }

    test('all alarms should be a concatenation of resolved and new alarms', async ({ gqlRunnerByGlobalAdmin }) => {
      const getAlarms = async (status: AlertCenterStatus) =>
        getAllWellAlarmsWithFilters(
          gqlRunnerByGlobalAdmin,
          buildingAboundId,
          status,
          AlertCenterDeviceType.All,
          customerId,
        );

      const allAlarms = await getAlarms(AlertCenterStatus.ALL);
      const resolvedAlarms = await getAlarms(AlertCenterStatus.RESOLVED);
      const newAlarms = await getAlarms(AlertCenterStatus.NEW);

      test.skip(newAlarms.length === 0 && resolvedAlarms.length === 0, 'no alarms to test');

      expect(allAlarms.map((alarm: { id: string }) => alarm.id)).toEqual(
        expect.arrayContaining(newAlarms.map((alarm: { id: string }) => alarm.id)),
      );
      expect(allAlarms.map((alarm: { id: string }) => alarm.id)).toEqual(
        expect.arrayContaining(resolvedAlarms.map((alarm: { id: string }) => alarm.id)),
      );
    });
  },
);
