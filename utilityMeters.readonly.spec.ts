import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import {
  Building,
  BuildingName,
  getBuildingForDevEnv,
  getBuildingForQaEnv,
  getBuildingForPreProdEnv,
  getBuildingForProdEnv,
} from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import {
  ByTextMeterFilter,
  ByTypeMeterFilter,
} from '@/tests/playwright/framework/pages/buildingview/settings/meters/MeterFilter';
import { MeterType } from '@/tests/playwright/framework/types/meters';
import { ManualUtilityMeterDetailsPage } from '@/tests/playwright/framework/pages/buildingview/settings/meters/utilitymeters/detailsPage/ManualUtilityMeterDetailsPage';
import { AutomaticUtilityMeterDetailsPage } from '@/tests/playwright/framework/pages/buildingview/settings/meters/utilitymeters/detailsPage/AutomaticUtilityMeterDetailsPage';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { Status } from '@/tests/playwright/framework/pages/buildingview/settings/meters/Helpers';
import { AuthorizedPage } from '@/tests/playwright/framework/pages/AuthorizedPage';
import { UtilityMetersPage } from '@/tests/playwright/framework/pages/buildingview/settings/meters/utilitymeters/UtilityMetersPage';
import { UtilityMeter } from '@/tests/playwright/framework/pages/buildingview/settings/meters/utilitymeters/UtilityMetersTable';

test.describe(
  'Settings',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    test.describe('Utility Meters', () => {
      const issues: KnownIssue[] = [];

      interface TestConfig {
        building: Building;
        existingMeterType: MeterType;
      }

      const CONFIGS: Map<Env, TestConfig> = new Map<Env, TestConfig>([
        [
          Env.LOCAL,
          {
            building: getBuildingForDevEnv(BuildingName.CIB),
            existingMeterType: 'electricity',
          },
        ],
        [
          Env.DEV,
          {
            building: getBuildingForDevEnv(BuildingName.CIB),
            existingMeterType: 'electricity',
          },
        ],
        [
          Env.QA,
          {
            building: getBuildingForQaEnv(BuildingName.CIB),
            existingMeterType: 'electricity',
          },
        ],
        [
          Env.PRE_PROD,
          {
            building: getBuildingForPreProdEnv(BuildingName.CAR_AUTOMATED_LOGIC_FACTORY),
            existingMeterType: 'electricity',
          },
        ],
        [
          Env.PROD,
          {
            building: getBuildingForProdEnv(BuildingName.CAR_CIB),
            existingMeterType: 'electricity',
          },
        ],
      ]);

      const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

      async function openUtilityMetersPage(
        page: AuthorizedPage,
        buildingName: BuildingName,
      ): Promise<UtilityMetersPage> {
        return openBuildingView(page, { buildingName: buildingName })
          .then((p) => p.buildingViewSideMenu.openSettingsPage())
          .then((p) => p.settingsSideMenu.openUtilityMetersPage());
      }

      test('smoke test: check main layout and meters search', async ({ globalAdminPage, withKnownIssues }) => {
        await withKnownIssues(issues).run(async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-7012', 'ABOUND-7012');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-7013', 'ABOUND-7013');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-7014', 'ABOUND-7014');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-7906', 'ABOUND-7906');

          const utilityMetersPage = await openUtilityMetersPage(globalAdminPage, CONFIG.building.name);

          let visibleMeters;

          await step(`search for an existing manual utility meter from the utility meters table`, async () => {
            visibleMeters = await utilityMetersPage.getVisibleMeters(10);
            const manualMeter = await pickMeterWithStatus(utilityMetersPage, Status.manual);

            if (manualMeter !== undefined) {
              visibleMeters = await searchByNumberAndGetVisibleMeters(utilityMetersPage, manualMeter.meterNo);
              expect(visibleMeters.length).toEqual(1);
              expect(visibleMeters[0].meterNo).toMatch(manualMeter.meterNo);
            }
          });

          await step(`search for non-existing meter`, async () => {
            visibleMeters = await searchByNumberAndGetVisibleMeters(
              utilityMetersPage,
              'NON_EXISTING_METER_SEARCH_STRING',
            );
            expect(visibleMeters.length).toEqual(0);
          });

          await step('filter by utility meter type', async () => {
            await utilityMetersPage.filterMeters([ByTypeMeterFilter.of(CONFIG.existingMeterType)]);
            const metersFilteredByType = await utilityMetersPage.getVisibleMeters(5);

            expect(new Set(metersFilteredByType.map((m) => m.type))).toEqual(new Set([CONFIG.existingMeterType]));
          });
        });
      });

      test('smoke test: check automatic meters', async ({ globalAdminPage, withKnownIssues }) => {
        await withKnownIssues(issues).run(async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-9341', 'ABOUND-9341');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8382', 'ABOUND-8382');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8392', 'ABOUND-8392');

          const utilityMetersPage = await openUtilityMetersPage(globalAdminPage, CONFIG.building.name);

          await step(
            'Verify that edit/information page is displayed properly for automatic utility meter',
            async () => {
              const automaticMeter = await pickMeterWithStatus(utilityMetersPage, Status.automatic);

              if (automaticMeter !== undefined) {
                const autoMeterNumber = automaticMeter.meterNo;
                const autoMeterDetailsPage = await utilityMetersPage.openAutomaticMeterDetailsPage(autoMeterNumber);
                expect(autoMeterDetailsPage.getMeterInfo().meterNo).toEqual(autoMeterNumber);

                const editMeterPage = await autoMeterDetailsPage
                  .goBackToUtilityMetersPage()
                  .then((p) => p.openAutomaticMeterEditPage(autoMeterNumber));
                const meterFormDetails = await editMeterPage.getMeterDetails();
                expect(meterFormDetails.meterId).toEqual(autoMeterNumber);
              }
            },
          );
        });
      });

      test('smoke test: Cancel button navigation for manual meter', async ({ globalAdminPage, withKnownIssues }) => {
        await withKnownIssues(issues).run(async () => {
          allure.description(
            'it should be possible to go to edit page through utility meter info page,' +
              '            cancel button on edit page should be context dependent\n' +
              '            - if edit page was entered from main setting page, cancel should bring back to main setting page\n' +
              '            - if edit page was entered from utility meter info page, cancel should bring back to the info page',
          );
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8375', 'ABOUND-8375');

          const utilityMetersPage = await openUtilityMetersPage(globalAdminPage, CONFIG.building.name);

          await step('the navigation check for the manual meter', async () => {
            const firstManualMeter = await pickMeterWithStatus(utilityMetersPage, Status.manual);

            if (firstManualMeter !== undefined) {
              const manualMeterNumber = firstManualMeter.meterNo;

              const manualMeterDetailsPage: ManualUtilityMeterDetailsPage = await utilityMetersPage
                .openManualMeterDetailsPage(manualMeterNumber)
                .then((p) => p.clickEdit())
                .then((p) => p.cancel());

              expect(manualMeterDetailsPage).toBeTruthy();
              await manualMeterDetailsPage
                .goBackToUtilityMetersPage()
                .then((p) => p.openManualMeterEditPage(manualMeterNumber))
                .then((p) => p.cancel());
            }
          });
        });
      });

      test('smoke test: Cancel button navigation for automatic meter', async ({ globalAdminPage, withKnownIssues }) => {
        await withKnownIssues(issues).run(async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8375', 'ABOUND-8375');

          const utilityMetersPage = await openUtilityMetersPage(globalAdminPage, CONFIG.building.name);
          await step('the navigation check for the automatic meter', async () => {
            const firstAutoMeter = await pickMeterWithStatus(utilityMetersPage, Status.automatic);

            if (firstAutoMeter !== undefined) {
              const autoMeterNumber = firstAutoMeter.meterNo;

              const autoMeterDetailsPage: AutomaticUtilityMeterDetailsPage = await utilityMetersPage
                .openAutomaticMeterDetailsPage(autoMeterNumber)
                .then((p) => p.clickEdit())
                .then((p) => p.cancel());

              expect(autoMeterDetailsPage).toBeTruthy();
              await autoMeterDetailsPage
                .goBackToUtilityMetersPage()
                .then((p) => p.openAutomaticMeterEditPage(autoMeterNumber))
                .then((p) => p.cancel());
            }
          });
        });
      });

      async function pickMeterWithStatus(
        utilityMetersPage: UtilityMetersPage,
        status: Status,
      ): Promise<UtilityMeter | void> {
        const defaultPaginationValue = 10;
        const meter = utilityMetersPage
          .getVisibleMeters(defaultPaginationValue)
          .then((p) => p.find((it) => it.status === (status as Status)));

        if (meter === undefined) {
          test.info().annotations.push({
            type: `needed meter type doesn't exist ${Status[status]}`,
            description: 'no manual meter is found in the table',
          });
        }

        return meter;
      }
      async function searchByNumberAndGetVisibleMeters(utilityMetersPage: UtilityMetersPage, meterNumber: string) {
        return utilityMetersPage
          .filterMeters([ByTextMeterFilter.of(meterNumber)])
          .then((result) => result.getVisibleMeters());
      }
    });
  },
);