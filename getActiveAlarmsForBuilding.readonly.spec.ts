import { expect } from '@playwright/test';

import { test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { getActiveAlarmsForBuilding } from '@/tests/playwright/tests/api/abound-alarm-gql/alarms/wellAlarms.step';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';

test.describe(
  'active alarms for building',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.LOCAL, BuildingName.CIB],
      [Env.DEV, BuildingName.ALC_NY_MAIN],
      [Env.QA, BuildingName.CIB],
      [Env.PRE_PROD, BuildingName.NY_NJ_OFFICE],
      [Env.PROD, BuildingName.ALC_NY_NJ],
    ]);

    const building = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv()));
    const customerId = getCustomerForEnv(building.site.customerName).id;

    test('get active alarms for building', async ({ gqlRunnerByGlobalAdmin }) => {
      const alarms = await getActiveAlarmsForBuilding(gqlRunnerByGlobalAdmin, building.id, customerId);

      test.skip(alarms.length === 0, 'No alarms found for building');

      alarms.forEach((alarm) => {
        expect(alarm).toMatchObject({ isActive: true });
      });
    });
  },
);