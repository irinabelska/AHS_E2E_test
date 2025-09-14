import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import {
  AboundCustomAlarmExtended,
  AlertCenterDeviceType,
  AlertCenterStatus,
} from '@/framework/constants/preferenceUnits';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import {
  getAllCustomAlarmsWithFilters,
  getAllCustomAlarmsWithFiltersVariables,
} from '@/tests/playwright/tests/api/abound-alarm-gql/alarms/customAlarms.step';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

test.describe(
  'getAllCustomAlarmsWithFilters',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const issues: KnownIssue[] = [
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-17990',
        expectedException(Error, '.*expected to contain all (new|resolved) alarms.*'),
      ),
    ];
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.LOCAL, BuildingName.CIB],
      [Env.DEV, BuildingName.ALC_NY_MAIN],
      [Env.QA, BuildingName.ALC_NY_MAIN],
      [Env.PRE_PROD, BuildingName.NY_NJ_OFFICE],
      [Env.PROD, BuildingName.ALC_NY_NJ],
    ]);
    const building = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv()));
    const buildingAboundId = building.id;
    const customerId = getCustomerForEnv(building.site.customerName).id;

    test(`getAllCustomAlarmsWithFilters(device=ALL, status=ALL)`, async ({
      gqlRunnerByGlobalAdmin,
      withKnownIssues,
    }) => {
      await withKnownIssues(issues).run(async () => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-11772', 'test case: ABOUND-11772');

        const allCustomAlarms = await getAllCustomAlarmsWithFilters(
          gqlRunnerByGlobalAdmin,
          getAllCustomAlarmsWithFiltersVariables(AlertCenterDeviceType.All, AlertCenterStatus.ALL, buildingAboundId),
          customerId,
        );
        expect(allCustomAlarms.length).toBeGreaterThanOrEqual(0);
      });
    });

    for (const alertStatus of [AlertCenterStatus.NEW, AlertCenterStatus.RESOLVED]) {
      test(`getAllCustomAlarmsWithFilters(alertStatus=${alertStatus})`, async ({ gqlRunnerByGlobalAdmin }) => {
        const customAlarms = await getAllCustomAlarmsWithFilters(
          gqlRunnerByGlobalAdmin,
          getAllCustomAlarmsWithFiltersVariables(AlertCenterDeviceType.All, alertStatus, buildingAboundId),
          customerId,
        );

        test.skip(customAlarms.length === 0, 'no alarms to test');

        customAlarms.forEach((alarm: AboundCustomAlarmExtended) => {
          const expectedIsActive = alertStatus === AlertCenterStatus.NEW;

          expect(alarm.isActive).toBe(expectedIsActive);
        });
      });
    }

    test('all alarms should contain all of resolved and new alarms', async ({
      gqlRunnerByGlobalAdmin,
      withKnownIssues,
    }) => {
      await withKnownIssues(issues).run(async () => {
        const allAlarms = await getAllCustomAlarmsWithFilters(
          gqlRunnerByGlobalAdmin,
          getAllCustomAlarmsWithFiltersVariables(AlertCenterDeviceType.All, AlertCenterStatus.ALL, buildingAboundId),
          customerId,
        );

        const newAlarms = await getAllCustomAlarmsWithFilters(
          gqlRunnerByGlobalAdmin,
          getAllCustomAlarmsWithFiltersVariables(AlertCenterDeviceType.All, AlertCenterStatus.NEW, buildingAboundId),
          customerId,
        );

        const resolvedAlarms = await getAllCustomAlarmsWithFilters(
          gqlRunnerByGlobalAdmin,
          getAllCustomAlarmsWithFiltersVariables(
            AlertCenterDeviceType.All,
            AlertCenterStatus.RESOLVED,
            buildingAboundId,
          ),
          customerId,
        );

        test.skip(newAlarms.length === 0 && resolvedAlarms.length === 0, 'no alarms to test');

        expect(
          allAlarms.map((alarm) => alarm.id),
          'expected to contain all new alarms',
        ).toEqual(expect.arrayContaining(newAlarms.map((alarm) => alarm.id)));
        expect(
          allAlarms.map((alarm) => alarm.id),
          'expected to contain all resolved alarms',
        ).toEqual(expect.arrayContaining(resolvedAlarms.map((alarm) => alarm.id)));
      });
    });
  },
);
