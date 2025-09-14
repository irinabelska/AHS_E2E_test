import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { AboundAlarm } from '@/framework/constants/preferenceUnits';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';
import {
  getActiveAlarmsForBuilding,
  validateAboundAlarm,
} from '@/tests/playwright/tests/api/abound-alarm-gql/alarms/wellAlarms.step';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

test.describe(
  'getAlarmsForSpace',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.LOCAL, BuildingName.CIB],
      [Env.DEV, BuildingName.ALC_NY_MAIN],
      [Env.QA, BuildingName.CIB],
      [Env.PRE_PROD, BuildingName.CIB],
      [Env.PROD, BuildingName.ALC_NY_NJ],
    ]);

    const building = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv()));
    const customerId = getCustomerForEnv(building.site.customerName, getCurrentEnv()).id;
    const buildingAboundId = building.id;

    test('getAlarmsForSpace', async ({ gqlRunnerByGlobalAdmin }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-11773', 'test case: ABOUND-11773');
      const alarms = await getActiveAlarmsForBuilding(gqlRunnerByGlobalAdmin, buildingAboundId, customerId);

      if (alarms.length === 0) {
        test.skip(true, `no alarms found for building ${buildingAboundId}`);
      }

      const nodeId = alarms[0].aboundId;
      const query = `
query getAlarmsForSpace($nodeId: String!) {
  getNodeById(id: $nodeId) {
    id
    activeAlarms {
      id
      aboundId
      acknowledgment
      acknowledgedByUserId
      isActive
      criticality
      type
      deviationFromNorm
      currentValue {
        timestamp
        value
      }
      alarmStartTime
      alarmEndedTime
      possibleSolutions
      silence
      snooze
    }
  }
}`;
      const variables = { nodeId };

      await gqlRunnerByGlobalAdmin.runTestStep(
        { query, variables, customerContext: { customerId } },
        async (apiResponse: APIResponse) => {
          const response: {
            data: {
              getNodeById: {
                id: string;
                activeAlarms: AboundAlarm[];
              };
            };
          } = await apiResponse.json();
          const nodeById = response.data.getNodeById;
          expect(nodeById.id).toBe(nodeId);

          const activeAlarms: AboundAlarm[] = nodeById.activeAlarms;
          activeAlarms.forEach((activeAlarm) => validateAboundAlarm(activeAlarm));
        },
        { stepTitle: 'get alarms for space' },
      );
    });
  },
);
