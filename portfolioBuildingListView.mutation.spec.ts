import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { BuildingStandards, Standard } from '@/tests/playwright/framework/entities/BuildingStandards';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import {
  BuildingListView,
  BuildingListViewCategory,
} from '@/tests/playwright/framework/pages/portfolioview/buildinglist/BuildingListView';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { PortfolioViewSideMenu } from '@/tests/playwright/framework/pages/PortfolioViewSideMenu';

test.describe(
  'Building List View',
  {
    tag: ['@regression', '@ui', '@setIaqStandardAlc'],
  },
  () => {
    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.LOCAL, BuildingName.CIB],
      [Env.DEV, BuildingName.ALC_NY_MAIN],
      [Env.QA, BuildingName.ALC_NY_MAIN],
      [Env.PRE_PROD, BuildingName.NY_NJ_OFFICE],
      [Env.PROD, BuildingName.ALC_NY_NJ],
    ]);

    const BUILDING = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv()));

    let portfolioViewSideMenu: PortfolioViewSideMenu;
    let standard: Standard;

    test('Building List view categories are displayed according to IAQ standard', async ({ globalAdminPage }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-18567', 'ABOUND-18567');

      await step(`Check categories with current standard`, async () => {
        portfolioViewSideMenu = await openBuildingView(globalAdminPage, {
          buildingName: BUILDING.name,
          featureFlags: { utilityPerformanceAvailable: true },
        })
          .then((_) => _.openPortfolioView())
          .then((_) => _.portfolioViewSideMenu);

        standard = await BuildingStandards.getApiSelectedIaqStandard(getCustomerForEnv(BUILDING.site.customerName));
        const buildingListView = await portfolioViewSideMenu.openBuildingList(standard);

        if (standard === BuildingStandards.wellStandard) {
          expect(Object.values(buildingListView.categories).map((_: BuildingListViewCategory) => _.name)).toEqual([
            BuildingListView.BUILDING_INFO,
            BuildingListView.LOCATION,
            BuildingListView.IAQ_PERFORMANCE,
            BuildingListView.ALERTING,
            BuildingListView.UTILITY_PERFORMANCE,
          ]);
        } else {
          expect(Object.values(buildingListView.categories).map((_: BuildingListViewCategory) => _.name)).toEqual([
            BuildingListView.BUILDING_INFO,
            BuildingListView.LOCATION,
            BuildingListView.UTILITY_PERFORMANCE,
          ]);
        }
      });

      const standardToSet = await BuildingStandards.setApiIaqStandard(
        BuildingStandards.getAnyOtherStandard(standard),
        getCustomerForEnv(BUILDING.site.customerName),
      );

      await step(
        `Change the standard and verify categories with changed standard: ${standardToSet.apiName}`,
        async () => {
          const buildingListView = await portfolioViewSideMenu.openBuildingList(standardToSet);

          if (standardToSet === BuildingStandards.wellStandard) {
            expect(
              Object.values(buildingListView.categories).map((category) => (category as BuildingListViewCategory).name),
            ).toEqual([
              BuildingListView.BUILDING_INFO,
              BuildingListView.LOCATION,
              BuildingListView.IAQ_PERFORMANCE,
              BuildingListView.ALERTING,
              BuildingListView.UTILITY_PERFORMANCE,
            ]);
          } else {
            expect(
              Object.values(buildingListView.categories).map((category) => (category as BuildingListViewCategory).name),
            ).toEqual([
              BuildingListView.BUILDING_INFO,
              BuildingListView.LOCATION,
              BuildingListView.UTILITY_PERFORMANCE,
            ]);
          }
        },
      );
    });
  },
);
