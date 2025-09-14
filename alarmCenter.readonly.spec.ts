import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import {
  Building,
  BuildingName,
  getBuildingForDevEnv,
  getBuildingForPreProdEnv,
  getBuildingForQaEnv,
} from '@/tests/playwright/framework/entities/Buildings';
import { AlarmStateType } from '@/tests/playwright/framework/pages/buildingview/alarmcenter/AlarmStateType';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import {
  MetricFilterType,
  MetricFilterTypes,
} from '@/tests/playwright/framework/pages/buildingview/alarmcenter/MetricFilter';
import { forceGetFromMap } from '@/framework/utils/map.utils';

test.describe(
  'Alarm center',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    const BUILDINGS = new Map<Env, Building>([
      [Env.PROD, getBuildingForPreProdEnv(BuildingName.CAR_CIB)],
      [Env.PRE_PROD, getBuildingForPreProdEnv(BuildingName.CIB)],
      [Env.QA, getBuildingForQaEnv(BuildingName.ALC_NY_MAIN)],
      [Env.DEV, getBuildingForDevEnv(BuildingName.ALC_NY_MAIN)],
      [Env.LOCAL, getBuildingForDevEnv(BuildingName.ALC_NY_MAIN)],
    ]);

    const issues: KnownIssue[] = [];

    const BUILDING = forceGetFromMap(BUILDINGS, getCurrentEnv());

    test('smoke test', async ({ globalAdminPage, withKnownIssues }) => {
      await withKnownIssues(issues).run(async () => {
        allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-7561', 'ABOUND-7561');

        let alarmCenter = await openBuildingView(globalAdminPage, { buildingName: BUILDING.name }).then((p) =>
          p.buildingViewSideMenu.openAlarmCenterPage(),
        );

        const initialAlarms = await alarmCenter.getAlarms(5);
        test.skip(initialAlarms.length === 0, 'No alarms are present on Alarm Center Page');

        alarmCenter = await step("check sorting by 'Start or status change'", async () => {
          alarmCenter = await alarmCenter.sortTable('startStatusChange', 'descending');

          const alarms = await alarmCenter.getAlarms(5);
          const alarmStartOrStatusChangeDates = alarms.map((a) => a.startOrStatusChange);
          const sortedByTime = [...alarmStartOrStatusChangeDates].sort((d1, d2) => d2.getTime() - d1.getTime());

          expect(alarmStartOrStatusChangeDates).toEqual(sortedByTime);

          return alarmCenter.clickAlarmTab('All Alerts');
        });

        alarmCenter = await step('check only resolved alarms are visible on resolved tab', async () => {
          alarmCenter = await alarmCenter.clickAlarmTab('Resolved');

          const alarms = await alarmCenter.getAlarms(5);
          alarms.forEach((alarm) => {
            if (alarm.origin.type !== 'Ai') {
              expect(alarm.state).toEqual(AlarmStateType.RESOLVED);
            }
          });

          return alarmCenter.clickAlarmTab('All Alerts');
        });

        alarmCenter = await step('check metric type filter', async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-13508', 'ABOUND-13508');
          const filterTypes: MetricFilterType[] = Object.values(MetricFilterTypes);
          const metricType: MetricFilterType | undefined = initialAlarms
            .flatMap((alarm) =>
              filterTypes.find((type) => alarm.description.includes(type))
                ? [filterTypes.find((type) => alarm.description.includes(type))]
                : [],
            )
            .find((type) => type);

          if (metricType) {
            alarmCenter = await alarmCenter.filterByMetricType(metricType);

            const alarms = await alarmCenter.getAlarms(5);
            expect(alarms.length, 'No alarms were displayed after filtering').toBeGreaterThan(0);
          }

          alarmCenter = await alarmCenter.filterByMetricType('IAQ Score');

          const alarms = await alarmCenter.getAlarms(5);
          expect(alarms.length, 'Alarms are displayed but should not').toBe(0);

          return alarmCenter;
        });
      });
    });
  },
);
