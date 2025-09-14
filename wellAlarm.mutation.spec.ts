import { faker } from '@faker-js/faker';
import { expect } from '@playwright/test';

import { AlertCenterDeviceType, SnoozeInterval, AlertCenterStatus } from '@/framework/constants/preferenceUnits';
import { test } from '@/tests/playwright/framework/TestConfig';
import { getAllWellAlarmsWithFilters } from '@/tests/playwright/tests/api/abound-alarm-gql/alarms/wellAlarms.step';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

test.describe(
  'share and update preferences of well alarm',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.LOCAL, BuildingName.CIB],
      [Env.DEV, BuildingName.CIB],
      [Env.QA, BuildingName.CIB],
      [Env.PRE_PROD, BuildingName.NY_NJ_OFFICE],
      [Env.PROD, BuildingName.ALC_NY_NJ],
    ]);
    const BUILDING = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv()));
    const customerId = getCustomerForEnv(BUILDING.site.customerName, getCurrentEnv()).id;

    const shareWellAlarmVariables = (recipients: string[], alarmId: string, message: string) => ({
      data: { recipients, message, alarmId },
    });

    const shareWellAlarmQuery = `
mutation shareWellAlarm($data: ShareWellAlarmInput!) {
  shareWellAlarm(shareWellAlarmInput: $data) {
    success
    msg
  }
}`;

    const updateAlarmPreferencesVariables = (
      alarmIds: string[],
      acknowledgment: boolean,
      silence: boolean,
      snooze: SnoozeInterval,
    ) => ({
      args: { alarmIds, acknowledgment, silence, snooze },
    });

    const updateAlarmPreferencesQuery = `
mutation updateAlarmPreferences($args: UpdateAlarmPreferencesInput!) {
  updateAlarmPreferences(updateAlarmPreferencesInput: $args) {
    success {
      id
    }
    failed
  }
}`;

    const knownIssues: KnownIssue[] = [
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-17804',
        expectedException(Error, '.*found more than one alarm for id*'),
      ),
    ];

    test('share well alarm', async ({ gqlRunnerByGlobalAdmin, withKnownIssues }) => {
      await withKnownIssues(knownIssues).run(async () => {
        const alarms = await getAllWellAlarmsWithFilters(
          gqlRunnerByGlobalAdmin,
          BUILDING.id,
          AlertCenterStatus.ALL,
          AlertCenterDeviceType.All,
          customerId,
        );

        test.skip(alarms.length === 0, 'no alarms to test');

        const alarm = alarms[0];

        await gqlRunnerByGlobalAdmin.runTestStep(
          {
            query: shareWellAlarmQuery,
            variables: shareWellAlarmVariables([faker.internet.email()], alarm.id, faker.lorem.text()),
            customerContext: { customerId },
          },
          async (apiResponse) => {
            const response = await apiResponse.json();

            if (response.errors?.[0]) {
              throw new Error(response.errors[0].message);
            }

            expect(response.data.shareWellAlarm?.success).toBe(true);
          },
          { stepTitle: 'share well alarm' },
        );
      });
    });

    test('update preferences of well alarm', async ({ gqlRunnerByGlobalAdmin }) => {
      const getAllWellAlarms = () =>
        getAllWellAlarmsWithFilters(
          gqlRunnerByGlobalAdmin,
          BUILDING.id,
          AlertCenterStatus.ALL,
          AlertCenterDeviceType.All,
          customerId,
        );

      const alarms = await getAllWellAlarms();

      test.skip(alarms.length === 0, 'no alarms to test');

      const alarm = alarms[0];

      const updatePreferences = (
        alarmIds: string[],
        acknowledge: boolean,
        silence: boolean,
        snooze: SnoozeInterval,
      ): Promise<void> =>
        gqlRunnerByGlobalAdmin.runTestStep(
          {
            query: updateAlarmPreferencesQuery,
            variables: updateAlarmPreferencesVariables(alarmIds, acknowledge, silence, snooze),
            customerContext: { customerId },
          },
          async (apiResponse) => {
            const response = await apiResponse.json();
            expect(response.data.updateAlarmPreferences.success[0].id).toEqual(alarm.id);
          },
          {
            stepTitle: `update alarm, preferences=${JSON.stringify(
              updateAlarmPreferencesVariables(alarmIds, acknowledge, silence, snooze),
            )}`,
          },
        );

      await updatePreferences([alarm.id], true, true, SnoozeInterval.Day);
      let updatedAlarms = await getAllWellAlarms().then((alarms) => alarms.filter((a) => a.id === alarm.id));

      expect(updatedAlarms.length).toBe(1);
      let updatedAlarm = updatedAlarms[0];

      expect(updatedAlarm.acknowledgment).toBe(true);
      expect(updatedAlarm.acknowledgedByUserId).toBeDefined();
      expect(updatedAlarm.silence).toBe(true);
      expect(updatedAlarm.snooze).toBeGreaterThan(new Date().getTime());

      await updatePreferences([alarm.id], false, false, SnoozeInterval.None);
      updatedAlarms = await getAllWellAlarms().then((alarms) => alarms.filter((a) => a.id === alarm.id));

      expect(updatedAlarms.length).toBe(1);
      updatedAlarm = updatedAlarms[0];

      expect(updatedAlarm.acknowledgment).toBe(false);
      expect(updatedAlarm.acknowledgedByUserId).toBeNull();
      expect(updatedAlarm.silence).toBeFalsy();
      expect(updatedAlarm.snooze).toBeTruthy();
    });
  },
);
