/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { AboundCustomAlarmExtended, TriggerType } from '@/framework/constants/preferenceUnits';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import {
  getActiveCustomAlarmsForBuilding,
  validateCustomAboundAlarmViewModel,
} from '@/tests/playwright/tests/api/abound-alarm-gql/alarms/customAlarms.step';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

test.describe(
  'getCustomAlarmsForSpace',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.LOCAL, BuildingName.CIB],
      [Env.DEV, BuildingName.ALC_NY_MAIN],
      [Env.QA, BuildingName.ALC_NY_MAIN],
      [Env.PRE_PROD, BuildingName.NY_NJ_OFFICE],
      [Env.PROD, BuildingName.ALC_NY_NJ],
    ]);
    const building = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv()));
    const customerId = getCustomerForEnv(building.site.customerName).id;

    test('fetch getCustomAlarmsForSpace', async ({ gqlRunnerByGlobalAdmin }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-11773', 'test case: ABOUND-11773');
      const spaceRelatedAlarms = (
        await getActiveCustomAlarmsForBuilding(gqlRunnerByGlobalAdmin, building.id, customerId)
      ).filter((alarm) => alarm.alert?.trigger?.type === TriggerType.Space);
    test('fetch getCustomAlarmsForSpace', async ({ gqlRunnerByGlobalAdmin }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-11773', 'test case: ABOUND-11773');
      const spaceRelatedAlarms = (
        await getActiveCustomAlarmsForBuilding(gqlRunnerByGlobalAdmin, building.id, customerId)
      ).filter((alarm) => alarm.alert?.trigger?.type === TriggerType.Space);

      if (spaceRelatedAlarms.length === 0) {
        test.skip(true, `no alarms found for building ${building.id}`);
      }
      if (spaceRelatedAlarms.length === 0) {
        test.skip(true, `no alarms found for building ${building.id}`);
      }

      const nodeId = spaceRelatedAlarms[0].aboundId;
      const query = `
  query getCustomAlarmsForSpace($nodeId: String!) {
    getNodeById(id: $nodeId) {
      id
      activeCustomAlarms {
        id
        aboundId
        acknowledgment
        acknowledgedByUserId
        buildingId
        alarmType
        isActive
        alert {
          category
          createdAt
          createdBy
          criticality
          description
          enabled
          id
          name
          notes
          routing {
            targets
            type
          }
          trigger {
            buildingIds
            conditions {
              conditionType
              conditionValues
              metricName
            }
            type
          }
          updatedAt
          updatedBy
        }
        alarmStartTime
        alarmEndedTime
      }
    }
  }`;
      const variables = { nodeId };

      await gqlRunnerByGlobalAdmin.runTestStep(
        { query, variables },
        async (apiResponse: APIResponse) => {
          const response = await apiResponse.json();
          const nodeById = response.data.getNodeById;
          expect(nodeById.id).toBe(nodeId);

          const activeAlarms: AboundCustomAlarmExtended[] = nodeById.activeCustomAlarms;
          activeAlarms.forEach((activeAlarm) => validateCustomAboundAlarmViewModel(activeAlarm));
        },
        { stepTitle: 'get alarms for space' },
      );
    });
  },
);