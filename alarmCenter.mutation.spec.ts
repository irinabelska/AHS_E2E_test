import { expect } from '@playwright/test';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import {
  Building,
  BuildingName,
  getBuildingForDevEnv,
  getBuildingForPreProdEnv,
  getBuildingForQaEnv,
} from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { AlarmCenterPage } from '@/tests/playwright/framework/pages/buildingview/alarmcenter/AlarmCenterPage';
import {
  ACKNOWLEDGE,
  ADD_TO_WATCHLIST,
  AlarmSnoozed,
  isCustomAlarm,
  isWellAlarm,
  REMOVE_ACKNOWLEDGE,
  REMOVE_WATCHLIST,
  RESUME_NOTIFICATIONS,
  SILENCE_NOTIFICATIONS,
} from '@/tests/playwright/framework/pages/buildingview/alarmcenter/AlarmTable';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { AuthorizedPage } from '@/tests/playwright/framework/pages/AuthorizedPage';
import { BuildingStandards } from '@/tests/playwright/framework/entities/BuildingStandards';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { ChartDuration } from '@/tests/playwright/framework/types/chart';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';

test.describe(
  'Alarm center',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    const BUILDINGS = new Map<Env, Building>([
      [Env.PROD, getBuildingForPreProdEnv(BuildingName.CAR_CIB)],
      [Env.PRE_PROD, getBuildingForPreProdEnv(BuildingName.PREPROD_TRUIST_PARK)],
      [Env.QA, getBuildingForQaEnv(BuildingName.ALC_NY_MAIN)],
      [Env.DEV, getBuildingForDevEnv(BuildingName.ALC_NY_MAIN)],
      [Env.LOCAL, getBuildingForDevEnv(BuildingName.ALC_NY_MAIN)],
    ]);

    const knownIssues: KnownIssue[] = [
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-20204',
        expectedException(Error, /missing alarm, id=([A-F0-9]+)/),
      ),
    ];

    const building = forceGetFromMap(BUILDINGS, getCurrentEnv());

    async function openAlarmCenterPage(page: AuthorizedPage, buildingId: BuildingName): Promise<AlarmCenterPage> {
      return openBuildingView(page, { buildingName: buildingId }).then((p) =>
        p.buildingViewSideMenu.openAlarmCenterPage(),
      );
    }

    test('it should be possible to action upon well alarms', async ({ globalAdminPage, withKnownIssues }) => {
      await withKnownIssues(knownIssues).run(async () => {
        const bvPage = await openBuildingView(globalAdminPage, { buildingName: building.name });
        await BuildingStandards.setApiIaqStandard(
          BuildingStandards.wellStandard,
          getCustomerForEnv(building.site.customerName),
        );
        let alarmCenterPage: AlarmCenterPage = await bvPage.buildingViewSideMenu.openAlarmCenterPage();
        const wellAlarms = (await alarmCenterPage.sortTable('origin', 'descending').then((_) => _.getAlarms(10)))
          .filter((a) => isWellAlarm(a))
          .map((a) => a);

        test.skip(wellAlarms.length === 0, 'skipping the test as no well alarms found');

        alarmCenterPage = await step('test operations on well alarm', async () => {
          const wellAlarm = wellAlarms.find(
            (a) =>
              !a.context.acknowledged && !a.context.watched && !a.context.silencedNotifications && !a.context.snoozed,
          );

          if (wellAlarm) {
            alarmCenterPage = await step('acknowledge well alarm then remove acknowledge', async () => {
              alarmCenterPage = await alarmCenterPage.performAction(wellAlarm.acknowledge);
              const ackedAlarm = await alarmCenterPage.forceGetAlarm(wellAlarm.id, isWellAlarm);
              expect(
                ackedAlarm.context.acknowledged,
                `alarm should be acked, alarm=${JSON.stringify(ackedAlarm)}`,
              ).toBeTruthy();

              alarmCenterPage = await alarmCenterPage.performAction(ackedAlarm.removeAcknowledge);
              const unAckedAlarm = await alarmCenterPage.forceGetAlarm(ackedAlarm.id, isWellAlarm);
              expect(
                unAckedAlarm.context.acknowledged,
                `alarm should not be acked, alarm=${JSON.stringify(ackedAlarm)}`,
              ).toBeFalsy();

              return alarmCenterPage;
            });

            alarmCenterPage = await step('silence (then resume) notifications for well alarm', async () => {
              alarmCenterPage = await alarmCenterPage.performAction(wellAlarm.silenceNotifications);
              const silencedAlarm = await alarmCenterPage.forceGetAlarm(wellAlarm.id, isWellAlarm);
              expect(
                silencedAlarm.context.silencedNotifications,
                `alarm should be silenced, alarm=${JSON.stringify(silencedAlarm)}`,
              ).toBeTruthy();

              alarmCenterPage = await alarmCenterPage.performAction(silencedAlarm.resumeNotifications);
              const unSilencedAlarm = await alarmCenterPage.forceGetAlarm(silencedAlarm.id, isWellAlarm);
              expect(
                unSilencedAlarm.context.silencedNotifications,
                `alarm should not be silenced, alarm=${JSON.stringify(unSilencedAlarm)}`,
              ).toBeFalsy();

              return alarmCenterPage;
            });

            alarmCenterPage = await step('toggle snooze well alarm for an hour', async () => {
              alarmCenterPage = await alarmCenterPage.performAction(wellAlarm.snoozeRemindInHour);
              expect(
                (await alarmCenterPage.forceGetAlarm(wellAlarm.id, isWellAlarm)).context.snoozed,
                'Timer value is not 60 minutes',
              ).toEqual(new AlarmSnoozed(60, 'minutes'));

              const actualDotsMenuItems = await (await alarmCenterPage.openAlarmThreeDotsMenu(wellAlarm.id)).getItems();
              const expectedOptionsCount = 4;

              expect(actualDotsMenuItems.length).toEqual(expectedOptionsCount);
              expect([ADD_TO_WATCHLIST, REMOVE_WATCHLIST]).toContain(actualDotsMenuItems[0]);
              expect([SILENCE_NOTIFICATIONS, RESUME_NOTIFICATIONS]).toContain(actualDotsMenuItems[1]);
              expect([ACKNOWLEDGE, REMOVE_ACKNOWLEDGE]).toContain(actualDotsMenuItems[2]);
              expect(/Snoozed for (59|60) minutes/.test(actualDotsMenuItems[3])).toBeTruthy();

              return alarmCenterPage;
            });

            alarmCenterPage = await step('add well alarm to watchlist then remove it from watchlist', async () => {
              let myWatchListPage = await alarmCenterPage
                .performAction(wellAlarm.addToWatchList)
                .then((_) => _.clickAlarmTab('My watchlist'));

              const watchedAlarm = await myWatchListPage.forceGetAlarm(wellAlarm.id, isWellAlarm);
              expect(watchedAlarm.context.watched).toBeTruthy();

              myWatchListPage = await myWatchListPage.performAction(watchedAlarm.removeFromWatchList);
              expect(await myWatchListPage.getAlarm(wellAlarm.id)).toBeUndefined();

              alarmCenterPage = await myWatchListPage.clickAlarmTab('All Alerts');

              return alarmCenterPage;
            });
          } else {
            test.skip(true, 'No well alarm was found from the top 10 alarms');
          }

          return alarmCenterPage;
        });
      });
    });

    test('Verify well alarm details', async ({ globalAdminPage }) => {
      const bvPage = await openBuildingView(globalAdminPage, { buildingName: building.name });
      await BuildingStandards.setApiIaqStandard(
        BuildingStandards.wellStandard,
        getCustomerForEnv(building.site.customerName),
      );
      let alarmCenterPage: AlarmCenterPage = await bvPage.buildingViewSideMenu.openAlarmCenterPage();
      const wellAlarms = (await alarmCenterPage.sortTable('origin', 'descending').then((_) => _.getAlarms(10)))
        .filter((a) => isWellAlarm(a))
        .map((a) => a);

      test.skip(wellAlarms.length === 0, 'skipping the test as no well alarms found');

      alarmCenterPage = await step('test operations on well alarm', async () => {
        const wellAlarm = wellAlarms.find(
          (a) =>
            !a.context.acknowledged && !a.context.watched && !a.context.silencedNotifications && !a.context.snoozed,
        );

        if (wellAlarm) {
          alarmCenterPage = await step('acknowledge and remove acknowledge from alarm details', async () => {
            let alarmDetails = await alarmCenterPage.openAlarmDetails(wellAlarm.id);

            await alarmDetails.acknowledgeAlarm();
            await alarmDetails.closeAlarmDetails();

            const acknowledgedAlarm = await alarmCenterPage.forceGetAlarm(wellAlarm.id, isWellAlarm);

            expect(
              acknowledgedAlarm.context.acknowledged,
              `alarm should be acked, alarm=${JSON.stringify(wellAlarm)}`,
            ).toBeTruthy();

            alarmDetails = await alarmCenterPage.openAlarmDetails(wellAlarm.id);
            await alarmDetails.removeAcknowledgeAlarm();
            await alarmDetails.closeAlarmDetails();

            const unnAcknowledgedAlarm = await alarmCenterPage.forceGetAlarm(wellAlarm.id, isWellAlarm);

            expect(
              unnAcknowledgedAlarm.context.acknowledged,
              `alarm should not be acked, alarm=${JSON.stringify(unnAcknowledgedAlarm)}`,
            ).toBeFalsy();

            return alarmCenterPage;
          });

          await step('share alarm from alarm details', async () => {
            const sharedAlarm = {
              email: 'non-existing-e2e-test@carrier.com',
              message: 'test message',
            };

            const alarmDetails = await alarmCenterPage.openAlarmDetails(wellAlarm.id);

            await alarmDetails.shareAlarm(sharedAlarm.email, sharedAlarm.message);
            await alarmDetails.closeAlarmDetails();
          });

          await step('verify solutions and switch alarm chart durations', async () => {
            const alarmDetails = await alarmCenterPage.openAlarmDetails(wellAlarm.id);

            await alarmDetails.selectStatusHistoryTab();

            let alarmStatusGraph = await alarmDetails.selectStatusHistoryTab();
            expect(await alarmStatusGraph.getActiveChartDuration()).toEqual(ChartDuration.TWELVE_HOUR);

            const durations = [ChartDuration.DAY, ChartDuration.WEEK, ChartDuration.MONTH, ChartDuration.TWELVE_HOUR];

            for (const duration of durations) {
              alarmStatusGraph = await alarmDetails.switchChartDuration(duration);
              expect(await alarmStatusGraph.getActiveChartDuration()).toEqual(duration);
            }

            await alarmDetails.selectSolutionsTab();

            await alarmDetails.closeAlarmDetails();
          });
        } else {
          test.skip(true, 'No well alarm was found from the top 10 alarms');
        }

        return alarmCenterPage;
      });
    });

    test('it should be possible to action upon custom alarms', async ({ globalAdminPage, withKnownIssues }) => {
      await withKnownIssues(knownIssues).run(async () => {
        let alarmCenterPage: AlarmCenterPage = await openAlarmCenterPage(globalAdminPage, building.name);
        const customAlarms = (await alarmCenterPage.sortTable('origin', 'ascending').then((_) => _.getAlarms(10)))
          .filter((a) => isCustomAlarm(a))
          .map((a) => a);

        test.skip(customAlarms.length === 0, 'skipping the test as no custom alarms found');

        alarmCenterPage = await step('test operations on custom alarm', async () => {
          const customAlarm = customAlarms.find(
            (a) =>
              !a.context.acknowledged &&
              !a.context.watched &&
              !a.context.silencedNotifications &&
              !a.context.snoozed &&
              !a.description.includes('Ai Generated'),
          );

          if (customAlarm) {
            alarmCenterPage = await step('acknowledge custom alarm then remove acknowledge', async () => {
              alarmCenterPage = await alarmCenterPage.performAction(customAlarm.acknowledge);
              const ackedAlarm = await alarmCenterPage.forceGetAlarm(customAlarm.id, isCustomAlarm);
              expect(
                ackedAlarm.context.acknowledged,
                `alarm should be acked, alarm=${JSON.stringify(ackedAlarm)}`,
              ).toBeTruthy();

              alarmCenterPage = await alarmCenterPage.performAction(ackedAlarm.removeAcknowledge);
              const unAckedAlarm = await alarmCenterPage.forceGetAlarm(ackedAlarm.id, isCustomAlarm);
              expect(
                unAckedAlarm.context.acknowledged,
                `alarm should not be acked, alarm=${JSON.stringify(ackedAlarm)}`,
              ).toBeFalsy();

              return alarmCenterPage;
            });

            alarmCenterPage = await step('add custom alarm to watchlist then remove it from watchlist', async () => {
              let myWatchListPage = await alarmCenterPage
                .performAction(customAlarm.addToWatchList)
                .then((_) => _.clickAlarmTab('My watchlist'));

              const watchedAlarm = await myWatchListPage.forceGetAlarm(customAlarm.id, isCustomAlarm);
              expect(watchedAlarm.context.watched).toBeTruthy();

              myWatchListPage = await myWatchListPage.performAction(watchedAlarm.removeFromWatchList);
              expect(await myWatchListPage.getAlarm(customAlarm.id)).toBeUndefined();

              alarmCenterPage = await myWatchListPage.clickAlarmTab('All Alerts');

              return alarmCenterPage;
            });
          } else {
            test.skip(true, 'No custom alarm was found from the top 10 alarms');
          }

          return alarmCenterPage;
        });
      });
    });

    test('Verify Custom alarm details', async ({ globalAdminPage }) => {
      let alarmCenterPage: AlarmCenterPage = await openAlarmCenterPage(globalAdminPage, building.name);
      const customAlarms = (await alarmCenterPage.sortTable('origin', 'ascending').then((_) => _.getAlarms(10)))
        .filter((a) => isCustomAlarm(a))
        .map((a) => a);

      test.skip(customAlarms.length === 0, 'skipping the test as no custom alarms found');

      alarmCenterPage = await step('test operations on custom alarm from alarm details', async () => {
        const customAlarm = customAlarms.find(
          (a) =>
            !a.context.acknowledged && !a.context.watched && !a.context.silencedNotifications && !a.context.snoozed,
        );

        if (customAlarm) {
          alarmCenterPage = await step('acknowledge and remove acknowledge from alarm details', async () => {
            let alarmDetails = await alarmCenterPage.openAlarmDetails(customAlarm.id);

            await alarmDetails.acknowledgeAlarm();
            await alarmDetails.closeAlarmDetails();
            await alarmCenterPage.sortTable('origin', 'ascending');

            const acknowledgedAlarm = await alarmCenterPage.forceGetAlarm(customAlarm.id, isCustomAlarm);

            expect(
              acknowledgedAlarm.context.acknowledged,
              `alarm should be acked, alarm=${JSON.stringify(customAlarm)}`,
            ).toBeTruthy();

            alarmDetails = await alarmCenterPage.openAlarmDetails(customAlarm.id);
            await alarmDetails.removeAcknowledgeAlarm();
            await alarmDetails.closeAlarmDetails();
            await alarmCenterPage.sortTable('origin', 'ascending');

            const unnAcknowledgedAlarm = await alarmCenterPage.forceGetAlarm(customAlarm.id, isCustomAlarm);

            expect(
              unnAcknowledgedAlarm.context.acknowledged,
              `alarm should not be acked, alarm=${JSON.stringify(unnAcknowledgedAlarm)}`,
            ).toBeFalsy();

            return alarmCenterPage;
          });

          await step('share alarm from alarm details', async () => {
            const sharedAlarm = {
              email: 'non-existing-e2e-test@carrier.com',
              message: 'test message',
            };

            const alarmDetails = await alarmCenterPage.openAlarmDetails(customAlarm.id);

            await alarmDetails.shareAlarm(sharedAlarm.email, sharedAlarm.message);
            await alarmDetails.closeAlarmDetails();
          });

          await step('verify solutions and switch alarm chart duration', async () => {
            const alarmDetails = await alarmCenterPage.openAlarmDetails(customAlarm.id);

            await alarmDetails.selectStatusHistoryTab();

            let alarmStatusGraph = await alarmDetails.selectStatusHistoryTab();
            expect(await alarmStatusGraph.getActiveChartDuration()).toEqual(ChartDuration.TWELVE_HOUR);

            const durations = [ChartDuration.DAY, ChartDuration.WEEK, ChartDuration.MONTH, ChartDuration.TWELVE_HOUR];

            for (const duration of durations) {
              alarmStatusGraph = await alarmDetails.switchChartDuration(duration);
              expect(await alarmStatusGraph.getActiveChartDuration()).toEqual(duration);
            }

            await alarmDetails.selectSolutionsTab();

            await alarmDetails.closeAlarmDetails();
          });
        } else {
          test.skip(true, 'No custom alarm was found from the top 10 alarms');
        }

        return alarmCenterPage;
      });
    });
  },
);
