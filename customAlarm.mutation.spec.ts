import { expect } from '@playwright/test';

import { AlertCenterDeviceType, AlertCenterStatus } from '@/framework/constants/preferenceUnits';
import { test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { getAllCustomAlarmsWithFilters } from '@/tests/playwright/tests/api/abound-alarm-gql/alarms/customAlarms.step';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

test.describe(
  'share and update preferences of custom alarm',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const issues: KnownIssue[] = [
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-17242',
        expectedException(Error, '.*Cannot read properties of null.*'),
      ),
    ];

    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.LOCAL, BuildingName.CIB],
      [Env.DEV, BuildingName.ALC_NY_MAIN],
      [Env.QA, BuildingName.ALC_NY_MAIN],
      [Env.PRE_PROD, BuildingName.NY_NJ_OFFICE],
      [Env.PROD, BuildingName.ALC_NY_NJ],
    ]);
    const BUILDING = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv()));

    const customerId = getCustomerForEnv(BUILDING.site.customerName).id;

    const updateCustomPreferencesVariables = (alarmIds: string[], acknowledgment: boolean) => ({
      args: { alarmIds, acknowledgment },
    });

    const updateCustomPreferencesQuery = `
mutation updateCustomAlarmPreferences($args: UpdateCustomAlarmPreferencesInput!) {
  updateCustomAlarmPreferences(updateCustomAlarmPreferencesInput: $args) {
    success {
      id
    }
    failed
  }
}`;

    test('update preferences of custom alarm', async ({ gqlRunnerByGlobalAdmin, withKnownIssues }) => {
      await withKnownIssues(issues).run(async () => {
        const getAllCustomAlarms = () =>
          getAllCustomAlarmsWithFilters(
            gqlRunnerByGlobalAdmin,
            {
              args: {
                buildingId: BUILDING.id,
                status: AlertCenterStatus.ALL,
                deviceType: AlertCenterDeviceType.All,
              },
            },
            customerId,
          );

        const alarms = await getAllCustomAlarms();

        test.skip(alarms.length === 0, 'no alarms to test');

        const alarm = alarms[0];

        const updatePreferences = (alarmIds: string[], acknowledge: boolean): Promise<void> =>
          gqlRunnerByGlobalAdmin.runTestStep(
            {
              query: updateCustomPreferencesQuery,
              variables: updateCustomPreferencesVariables(alarmIds, acknowledge),
            },
            async (apiResponse) => {
              const response = await apiResponse.json();
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              expect(response.data.updateCustomAlarmPreferences.success[0].id).toEqual(alarm.id);
            },
            {
              stepTitle: `update alarm, preferences=${JSON.stringify(
                updateCustomPreferencesVariables(alarmIds, acknowledge),
              )}`,
            },
          );

        await updatePreferences([alarm.id], true);
        let updatedAlarms = await getAllCustomAlarms().then((alarms) => alarms.filter((a) => a.id === alarm.id));

        expect(updatedAlarms.length).toBe(1);
        let updatedAlarm = updatedAlarms[0];

        expect(updatedAlarm.acknowledgment).toBe(true);
        expect(updatedAlarm.acknowledgedByUserId).toBeDefined();

        await updatePreferences([alarm.id], false);
        updatedAlarms = await getAllCustomAlarms().then((alarms) => alarms.filter((a) => a.id === alarm.id));

        expect(updatedAlarms.length).toBe(1);
        updatedAlarm = updatedAlarms[0];

        expect(updatedAlarm.acknowledgment).toBe(false);
        expect(updatedAlarm.acknowledgedByUserId).toBeNull();
      });
    });
  },
);
