import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { BuildingListViewTableRow } from '@/tests/playwright/framework/pages/portfolioview/buildinglist/BuildingListViewTable';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { BuildingStandards } from '@/tests/playwright/framework/entities/BuildingStandards';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { PortfolioViewPage } from '@/tests/playwright/framework/pages/AboundApplicationPage';
import {
  BuildingListNineFStandardCategories,
  BuildingListWellStandardCategories,
} from '@/tests/playwright/framework/pages/portfolioview/buildinglist/BuildingListView';
import {
  BUDGET_REGEX,
  CONSUMPTION_KBTU_GJ,
  EUI_REGEX,
  SPEND_CURRENCY,
  TOTAL_CARBON_REGEX,
  WATER_USAGE_REGEX,
} from '@/tests/playwright/framework/pages/buildingview/energy/EnergyRegExps';
import { openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { BuildingSortingProperty } from '@/framework/constants/preferenceUnits';

test.describe(
  'Building List View',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.LOCAL, BuildingName.CIB],
      [Env.DEV, BuildingName.CIB],
      [Env.QA, BuildingName.CIB],
      [Env.PRE_PROD, BuildingName.CIB],
      [Env.PROD, BuildingName.CAR_CIB],
    ]);

    const BUILDING = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv()));

    test('it is possible to select categories, sort the table and see tooltip', async ({ globalAdminPage }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-12474', 'ABOUND-12474');

      const portfolioViewPage = await openPortfolioView(globalAdminPage, { utilityPerformanceAvailable: true });
      const standard = await BuildingStandards.getApiSelectedIaqStandard(getCustomerForEnv(BUILDING.site.customerName));

      let buildingListView = await portfolioViewPage.topBar
        .selectCustomer(getCustomerForEnv(BUILDING.site.customerName).name)
        .then((_: PortfolioViewPage) => _.portfolioViewSideMenu.openBuildingList(standard))
        .then((_) => _.topBar.selectSite(BUILDING.site.name));

      buildingListView = await buildingListView.unselectAllCategories();
      buildingListView = await buildingListView.sortTable(BuildingSortingProperty.BuildingName, 'ascending');
      await step('validate table sorted properly', async () => {
        const tableContent = await buildingListView.getTableContent();
        const buildingNames = tableContent.rows.map((r: BuildingListViewTableRow) =>
          r.buildingName.toLowerCase().trim(),
        );
        const sortedBuildingNames = [...buildingNames].sort();

        expect(buildingNames).toEqual(sortedBuildingNames);
      });

      await step('Unselect All - validate table & categories selection', async () => {
        const tableHeaders = await buildingListView.getTableHeaders();
        expect(tableHeaders.portfolio?.name).toEqual('Portfolio');
        expect(tableHeaders.portfolio?.subHeaders).toMatchArray([/Building Name/]);

        const tableContent = await buildingListView.getTableContent(1);
        expect(tableContent.rows[0].buildingName).toBeDefined();

        if (standard === BuildingStandards.wellStandard) {
          const categories = buildingListView.categories as BuildingListWellStandardCategories;
          expect(await categories.buildingInfo.isSelected()).toBeFalsy();
          expect(await categories.location.isSelected()).toBeFalsy();
          expect(await categories.iaqPerformance.isSelected()).toBeFalsy();
          expect(await categories.alerting.isSelected()).toBeFalsy();
          expect(await categories.utilityPerformance?.isSelected()).toBeFalsy();

          expect(tableHeaders.buildingInfo).toBeUndefined();
          expect(tableHeaders.location).toBeUndefined();
          expect(tableHeaders.iaqPerformance).toBeUndefined();
          expect(tableHeaders.alerting).toBeUndefined();
          expect(tableHeaders.alerting).toBeUndefined();
          expect(tableHeaders.utilityPerformance).toBeUndefined();
          expect(tableHeaders.utilityPerformancePreviousYTD).toBeUndefined();

          expect(tableContent.rows[0].buildingInfo).toBeUndefined();
          expect(tableContent.rows[0].location).toBeUndefined();
          expect(tableContent.rows[0].iaqPerformance).toBeUndefined();
          expect(tableContent.rows[0].alerting).toBeUndefined();
          expect(tableContent.rows[0].utilityPerformance).toBeUndefined();
          expect(tableContent.rows[0].utilityPerformancePrevious).toBeUndefined();
        } else {
          const categories = buildingListView.categories as BuildingListNineFStandardCategories;
          expect(await categories.buildingInfo.isSelected()).toBeFalsy();
          expect(await categories.location.isSelected()).toBeFalsy();
          expect(await categories.utilityPerformance?.isSelected()).toBeFalsy();

          expect(tableHeaders.buildingInfo).toBeUndefined();
          expect(tableHeaders.location).toBeUndefined();
          expect(tableHeaders.utilityPerformance).toBeUndefined();
          expect(tableHeaders.utilityPerformancePreviousYTD).toBeUndefined();

          const tableContent = await buildingListView.getTableContent(1);
          expect(tableContent.rows[0].buildingInfo).toBeUndefined();
          expect(tableContent.rows[0].location).toBeUndefined();
          expect(tableContent.rows[0].utilityPerformance).toBeUndefined();
          expect(tableContent.rows[0].utilityPerformancePrevious).toBeUndefined();
        }
      });

      await step('Select All - validate table & categories selection', async () => {
        buildingListView = await buildingListView.selectAllCategories();

        const categories = buildingListView.categories as BuildingListWellStandardCategories;
        expect(await categories.buildingInfo.isSelected()).toBeTruthy();
        expect(await categories.location.isSelected()).toBeTruthy();

        const tableHeaders = await buildingListView.getTableHeaders();
        expect(tableHeaders.portfolio?.name).toEqual('Portfolio');
        expect(tableHeaders.portfolio?.subHeaders).toMatchArray([/Building Name/]);
        expect(tableHeaders.buildingInfo?.name).toEqual('Building Info');
        expect(tableHeaders.buildingInfo?.subHeaders).toMatchArray([/Area .*/, /Max Occupancy/, /Primary Usage/]);
        expect(tableHeaders.location?.name).toEqual('Location');
        expect(tableHeaders.location?.subHeaders).toMatchArray([/Location/]);

        const utilityPerformanceSubHeadersRegex = [
          CONSUMPTION_KBTU_GJ,
          SPEND_CURRENCY,
          WATER_USAGE_REGEX,
          BUDGET_REGEX,
          EUI_REGEX,
          TOTAL_CARBON_REGEX,
        ];

        expect(tableHeaders.utilityPerformance?.name).toEqual('Utility Performance (YTD)');
        expect(tableHeaders.utilityPerformance?.subHeaders).toMatchArray(utilityPerformanceSubHeadersRegex);
        expect(tableHeaders.utilityPerformancePreviousYTD?.name).toEqual('Utility Performance (Previous YTD)');
        expect(tableHeaders.utilityPerformancePreviousYTD?.subHeaders).toMatchArray([CONSUMPTION_KBTU_GJ]);

        const tableContent = await buildingListView.getTableContent(1);
        expect(tableContent.rows[0].buildingInfo).toBeDefined();
        expect(tableContent.rows[0].location).toBeDefined();
        expect(tableContent.rows[0].utilityPerformance).toBeDefined();
        expect(tableContent.rows[0].utilityPerformancePrevious).toBeDefined();

        if (standard === BuildingStandards.wellStandard) {
          expect(tableHeaders.alerting?.name).toEqual('Alerting');
          expect(tableHeaders.alerting?.subHeaders).toMatchArray([/Active Alerts/, /Critical/, /Caution/]);
          expect(tableHeaders.iaqPerformance?.name).toEqual('IAQ Performance');
          expect(tableHeaders.iaqPerformance?.subHeaders).toMatchArray([
            /Score \(WELL\)/,
            /Score Change/,
            /Temp \(.*\)/,
            /Humidity \(%\)/,
            /CO₂ \(ppm\)/,
            /PM2.5 \(.*\)/,
            /TVOC \(ppb\)/,
            /Radon \(pCi\/L\)/,
          ]);

          expect(await categories.iaqPerformance.isSelected()).toBeTruthy();
          expect(await categories.alerting.isSelected()).toBeTruthy();
          expect(tableContent.rows[0].iaqPerformance).toBeDefined();
          expect(tableContent.rows[0].alerting).toBeDefined();

          const iaqTooltip = await buildingListView.hooverOverIaqCell(BUILDING.name, 'iaqTemperature');
          expect(iaqTooltip).toBeDefined();

          await buildingListView.unHoover();

          const alertingTooltip = await buildingListView.hooverOverAlertingCell(BUILDING.name, 'alertingCriticalCount');
          expect(alertingTooltip).toBeDefined();
        }

        const utilityTooltip = await buildingListView.hooverOverUtilityPerformanceCell(BUILDING.name);
        expect(utilityTooltip).toBeDefined();
      });
    });
  },
);
