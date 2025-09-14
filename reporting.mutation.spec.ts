import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { startOfDay, subDays } from 'date-fns';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { DataComparisonReportDefinition } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/datacomparison/DataComparisonReportDefinition';
import { BuildingSelector, FloorSelector, RoomSelector } from '@/tests/playwright/framework/entities/LocationSelector';
import {
  CustomTimeframe,
  PredefinedTimeframe,
} from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/TimeframeDefinition';
import { ReportDefinition } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/ReportDefinition';
import { EditReportPage } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/ReportPage';
import { DevicesReportDefinition } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/devices/DevicesReportDefinition';
import { DeviceSelector } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/DevicesSelector';
import { IaqMetricsReportDefinition } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/iaq/IaqMetricsReportDefinition';
import { SpacesReportDefinition } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/spaces/SpacesReportDefinition';
import { ExceptionsReportDefinition } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/exceptions/ExceptionsReportDefinition';
import { AveragesReportDefinition } from '@/tests/playwright/framework/pages/buildingview/reporting/legacy/averages/AveragesReportDefinition';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { DeviceGroup } from '@/tests/playwright/framework/pages/buildingview/device/DeviceNavigator';

test.describe(
  'Portfolio view: Reporting',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    const today = new Date();
    const weekAgo = subDays(today, 7);
    const randomSuffix = Math.random().toString().replace('.', '').substring(0, 5);

    interface TestConfig {
      building: {
        id: BuildingName;
        floor: string;
        room: string;
        deviceGroup: DeviceGroup;
        deviceId: string;
      };
      otherBuilding: {
        id: BuildingName;
        floor: string;
        room: string;
        deviceGroup: DeviceGroup;
        deviceId: string;
      };
    }

    const DEV_QA_CONFIG: TestConfig = {
      building: {
        id: BuildingName.CIB,
        floor: 'Level 01',
        room: 'W103',
        deviceGroup: 'iaq',
        deviceId: '2969001926',
      },
      otherBuilding: {
        id: BuildingName.ALC_NY_MAIN,
        floor: 'Level 4',
        room: '423 Accounting',
        deviceGroup: 'hvac',
        deviceId: 'VAV.ACCOUNTING-423',
      },
    };

    const PRE_PROD_CONFIG: TestConfig = {
      building: {
        id: BuildingName.CIB,
        floor: 'Level 01',
        room: 'A101 Atrium',
        deviceGroup: 'iaq',
        deviceId: '2930020383',
      },
      otherBuilding: {
        id: BuildingName.NY_NJ_OFFICE,
        floor: 'Level 4',
        room: '423 Accounting',
        deviceGroup: 'hvac',
        deviceId: 'AHU.AHU-1',
      },
    };

    const CONFIGS = new Map<Env, TestConfig>([
      [Env.LOCAL, DEV_QA_CONFIG],
      [Env.DEV, DEV_QA_CONFIG],
      [Env.QA, DEV_QA_CONFIG],
      [Env.PRE_PROD, PRE_PROD_CONFIG],
    ]);

    const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reportsDefinitions: ReportDefinition<EditReportPage<any, any>>[] = [
      new AveragesReportDefinition(`e2e-averages-${randomSuffix}`, 'Temp', [
        new BuildingSelector(getBuildingById(CONFIG.building.id).name),
      ]),
      new DataComparisonReportDefinition(
        `e2e-data-comparison-${randomSuffix}`,
        ['Temp', 'Humidity'],
        [
          new FloorSelector(CONFIG.building.id, CONFIG.building.floor),
          new RoomSelector(CONFIG.otherBuilding.id, CONFIG.otherBuilding.floor, CONFIG.otherBuilding.room),
        ],
        new CustomTimeframe(weekAgo, today),
      ),
      new DevicesReportDefinition(
        `e2e-devices-${randomSuffix}`,
        'Temp',
        [
          new DeviceSelector(CONFIG.building.id, CONFIG.building.deviceGroup, CONFIG.building.deviceId),
          new DeviceSelector(CONFIG.otherBuilding.id, CONFIG.otherBuilding.deviceGroup, CONFIG.otherBuilding.deviceId),
        ],
        new PredefinedTimeframe('Last 24 hours'),
      ),
      new IaqMetricsReportDefinition(
        `e2e-iaq-metrics-${randomSuffix}`,
        new FloorSelector(CONFIG.building.id, CONFIG.building.floor),
        new PredefinedTimeframe('Last 24 hours'),
      ),
      new SpacesReportDefinition(
        `e2e-spaces-${randomSuffix}`,
        'Temp',
        [
          new FloorSelector(CONFIG.building.id, CONFIG.building.floor),
          new RoomSelector(CONFIG.otherBuilding.id, CONFIG.otherBuilding.floor, CONFIG.otherBuilding.room),
        ],
        new PredefinedTimeframe('Last 24 hours'),
      ),
      new ExceptionsReportDefinition(
        `e2e-exceptions-${randomSuffix}`,
        'Temp',
        [
          new RoomSelector(CONFIG.building.id, CONFIG.building.floor, CONFIG.building.room),
          new RoomSelector(CONFIG.otherBuilding.id, CONFIG.otherBuilding.floor, CONFIG.otherBuilding.room),
        ],
        { lower: 60, upper: 65 },
        new PredefinedTimeframe('Last 24 hours'),
      ),
    ];

    const issues: KnownIssue[] = [];
    for (const reportDefinition of reportsDefinitions) {
      test(`crud test for reporting, template=${reportDefinition.templateType}`, async ({
        withKnownIssues,
        globalAdminPage,
      }) => {
        test.setTimeout(420000); // Due to environment performance test run may take more than 5 minutes, set 7 minutes
        await withKnownIssues(issues).run(async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8576', 'ABOUND-8576');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8512', 'ABOUND-8512');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8187', 'ABOUND-8187');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8475', 'ABOUND-8475');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8239', 'ABOUND-8239');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8238', 'ABOUND-8238');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8510', 'ABOUND-8510');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8511', 'ABOUND-8511');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8477', 'ABOUND-8477');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8076', 'ABOUND-8076');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-7992', 'ABOUND-7992');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8312', 'ABOUND-8312');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8313', 'ABOUND-8313');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8478', 'ABOUND-8478');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-7993', 'ABOUND-7993');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-7994', 'ABOUND-7994');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8072', 'ABOUND-8072');
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8073', 'ABOUND-8073');

          const defaultDuplicatedReportName = `Copy of ${reportDefinition.name}`;
          const defaultDoubleDuplicatedReportName = `Copy of ${defaultDuplicatedReportName}`;
          const renamedReportName = `${reportDefinition.name}-renamed`;

          let reportingPage = await openPortfolioView(globalAdminPage, { legacyReportingAvailable: true }).then((p) =>
            p.portfolioViewSideMenu.openReporting(),
          );

          reportingPage = await step(
            `create report, template=${reportDefinition.templateType}, name=${reportDefinition.name}`,
            async () => {
              reportingPage = await reportingPage
                .createReport(reportDefinition)
                .then((p) => p.switchToViewMode() as unknown as typeof p)
                .then((p) => p.backToReportingPage());

              const createdReport = await reportingPage.getReportListItem(reportDefinition.name);

              if (!createdReport) {
                throw Error(`missing report, name=${reportDefinition.name}`);
              }

              expect(createdReport.createdBy).toEqual(globalAdminPage.user.firstAndLastName());
              expect(createdReport.createdOn).toEqual(startOfDay(new Date()));

              return reportingPage;
            },
          );

          await step(`duplicate report from report page, expectedName=${defaultDuplicatedReportName}`, async () => {
            reportingPage = await reportingPage
              .clickOnReport(reportDefinition)
              .then((p) => p.duplicateReport())
              .then((p) => p.backToReportingPage());

            const duplicatedReport = await reportingPage.getReportListItem(defaultDuplicatedReportName);

            expect(duplicatedReport).toBeTruthy();
          });

          await step(
            `duplicate report through kebab menu, expectedName=${defaultDoubleDuplicatedReportName}`,
            async () => {
              allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-8513', 'ABOUND-8513');
              reportingPage = await reportingPage.duplicateReport(defaultDuplicatedReportName);

              const duplicatedReport = await reportingPage.getReportListItem(defaultDoubleDuplicatedReportName);

              expect(duplicatedReport).toBeTruthy();
            },
          );

          await step(`rename report, name=${renamedReportName}`, async () => {
            reportingPage = await reportingPage
              .clickOnReport(reportDefinition)
              .then((p) => p.renameReport(renamedReportName) as unknown as typeof p)
              .then((p) => p.backToReportingPage());

            const renamedReport = await reportingPage.getReportListItem(renamedReportName);

            expect(renamedReport).toBeTruthy();
          });

          await step(`delete reports, [${renamedReportName}, ${defaultDuplicatedReportName}]`, async () => {
            reportingPage = await reportingPage
              .deleteReport(renamedReportName)
              .then((p) => p.deleteReport(defaultDuplicatedReportName))
              .then((p) => p.deleteReport(defaultDoubleDuplicatedReportName));

            const renamedReport = await reportingPage.getReportListItem(renamedReportName);
            const duplicatedReport = await reportingPage.getReportListItem(defaultDuplicatedReportName);
            const doubleDuplicatedReport = await reportingPage.getReportListItem(defaultDoubleDuplicatedReportName);

            expect(renamedReport).toBeFalsy();
            expect(duplicatedReport).toBeFalsy();
            expect(doubleDuplicatedReport).toBeFalsy();
          });
        });
      });
    }
  },
);
