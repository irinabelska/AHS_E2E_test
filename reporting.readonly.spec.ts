import { expect } from '@playwright/test';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import {
  Building,
  BuildingName,
  getBuildingForDevEnv,
  getBuildingForPreProdEnv,
  getBuildingForProdEnv,
  getBuildingForQaEnv,
} from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/framework/utils/map.utils';
import { AveragesReportEditPage } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/averages/AveragesReportPage';
import { DataComparisonEditReportPage } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/datacomparison/DataComparisonReportPage';
import { SpacesReportEditPage } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/spaces/SpacesReportPage';
import { ExceptionsReportEditPage } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/exceptions/ExceptionsReportPage';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';

test.describe(
  'Reporting',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    const BUILDINGS = new Map<Env, Building>([
      [Env.LOCAL, getBuildingForDevEnv(BuildingName.CIB)],
      [Env.DEV, getBuildingForDevEnv(BuildingName.CIB)],
      [Env.QA, getBuildingForQaEnv(BuildingName.CIB)],
      [Env.PRE_PROD, getBuildingForPreProdEnv(BuildingName.CIB)],
      [Env.PROD, getBuildingForProdEnv(BuildingName.CAR_CIB)],
    ]);

    const BUILDING = forceGetFromMap(BUILDINGS, getCurrentEnv());

    const knownIssues: KnownIssue[] = [
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-16767',
        expectedException(Error, '.*expected to find reports, but none found.*'),
      ),
    ];

    test('reporting page is displayed properly and each report template is displayed as expected', async ({
      globalAdminPage,
      withKnownIssues,
    }) => {
      await withKnownIssues(knownIssues).run(async () => {
        let reportingPage = await openBuildingView(globalAdminPage, {
          buildingName: BUILDING.name,
          featureFlags: {
            legacyReportingAvailable: true,
          },
        })
          .then((_) => _.buildingViewSideMenu.openReportingPage())
          .then((_) => _.openLegacyReports());

        const reports = await reportingPage.getReportListItems();

        expect(reports.length).toBeGreaterThan(0);

        const validateSpaces = async (
          page: AveragesReportEditPage | ExceptionsReportEditPage | SpacesReportEditPage | DataComparisonEditReportPage,
        ) => {
          const spaces = await page.getAvailableBuildings();
          expect(spaces.length).toEqual(1);
          expect(spaces[0]).toEqual(BUILDING.name);

          return page;
        };

        reportingPage = await step(
          'validate that Exceptions report template allows only to choose selected Building space',
          async () => {
            return reportingPage
              .clickOnExceptionsReportTemplate()
              .then((p) => p.setMetric('Humidity'))
              .then((p) => validateSpaces(p))
              .then((p) => p.backToReportingPage());
          },
        );

        reportingPage = await step(
          'validate on Averages report template allows only to choose selected Building space',
          async () => {
            return reportingPage
              .clickOnAveragesReportTemplate()
              .then((p) => p.setMetric('Humidity'))
              .then((p) => validateSpaces(p))
              .then((p) => p.backToReportingPage());
          },
        );

        reportingPage = await step(
          'validate Data Comparison report template allows only to choose selected Building space',
          async () => {
            return reportingPage
              .clickOnDataComparisonTemplate()
              .then((p) => p.setMetrics(['Humidity']))
              .then((p) => validateSpaces(p))
              .then((p) => p.backToReportingPage());
          },
        );

        reportingPage = await step(
          'validate Spaces report template allows only to choose selected Building space',
          async () => {
            return reportingPage
              .clickOnSpacesReportTemplate()
              .then((p) => p.setMetric('Humidity'))
              .then((p) => validateSpaces(p))
              .then((p) => p.backToReportingPage());
          },
        );

        await step(
          'validate Devices and IAQ Metrics templates (spaces are not validated due to inconsistency of the design)',
          async () => {
            return reportingPage
              .clickOnDevicesTemplate()
              .then((p) => p.backToReportingPage())
              .then((p) => p.clickOnIaqMetricsTemplate());
          },
        );
      });
    });
  },
);
