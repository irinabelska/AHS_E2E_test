import { expect } from '@playwright/test';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/framework/utils/map.utils';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';

test.describe(
  'Reporting [DBR]',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    type TestConfig = {
      reportName: string;
    };

    const CONFIGS = new Map<Env, TestConfig>([
      [Env.LOCAL, { reportName: 'E2E [5 Mins] Spaces Report' }],
      [Env.DEV, { reportName: 'E2E [5 Mins] Spaces Report' }],
      [Env.QA, { reportName: 'E2E [5 Mins] Spaces Report' }],
      [Env.PRE_PROD, { reportName: 'Averages Report' }],
      [Env.PROD, { reportName: 'Averages Report' }],
    ]);

    const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

    const knownIssues: KnownIssue[] = [];

    test('dbr reporting page is displayed properly and it is possible to export report to pdf', async ({
      globalAdminPage,
      withKnownIssues,
    }, testInfo) => {
      test.skip(globalAdminPage.getBrowserName() === 'firefox', 'as for now dbr does not support firefox');
      await withKnownIssues(knownIssues).run(async () => {
        let reportingPage = await openBuildingView(globalAdminPage, {
          featureFlags: {
            dashboardReportingAvailable: true,
          },
        })
          .then((p) => p.buildingViewSideMenu.openReportingPage())
          .then((p) => p.openDashboardReportingPage());

        let dbrReportPage = await step('open first of dbr reports', async () => {
          const reports = await reportingPage.getReports(15);
          expect(reports.length).toBeGreaterThan(0);

          return reportingPage.openReport(CONFIG.reportName);
        });

        await step('unselect default building to make sure the report is not empty', async () => {
          if (await dbrReportPage.isEmptyReport()) {
            await dbrReportPage.unselectDefaultBuilding();
          }
        });

        dbrReportPage = await step('export entire report to pdf', async () => {
          const downloadedPdf = await dbrReportPage.exportToPdf();

          expect(downloadedPdf.stats.size).toBeGreaterThan(0);
          await testInfo.attach('dbr-report.pdf', { contentType: 'application/pdf', path: downloadedPdf.path });

          return dbrReportPage;
        });

        dbrReportPage = await step('export averages report widget to image', async () => {
          const downloadedImage = await dbrReportPage.downloadImage();
          expect(downloadedImage.stats.size).toBeGreaterThan(0);
          await testInfo.attach('dbr-report.image', { contentType: 'image/png', path: downloadedImage.path });

          return dbrReportPage;
        });

        reportingPage = await dbrReportPage.clickClose();
        expect(reportingPage).toBeTruthy();
      });
    });
  },
);
