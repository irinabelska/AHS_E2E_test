import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { BuildingName } from '@/tests/playwright/framework/entities/Buildings';
import { step, test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/framework/utils/map.utils';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';

test.describe(
  'Energy',
  {
    tag: ['@regression', '@ui', '@parallel'],
  },
  () => {
    const issues: KnownIssue[] = [
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-18975',
        expectedException(Error, '.*energy-total-widget is not loaded due to the error on the page.*'),
        'The issue is actual only for the QA env',
      ),
    ];

    const BUILDINGS = new Map<Env, BuildingName>([
      [Env.DEV, BuildingName.CIB],
      [Env.LOCAL, BuildingName.CIB],
      [Env.QA, BuildingName.CIB],
      [Env.PRE_PROD, BuildingName.CIB],
      [Env.PROD, BuildingName.CAR_CIB],
    ]);

    test('all components of energy > utility meters, consumption mode are loaded', async ({
      globalAdminPage,
      withKnownIssues,
    }) => {
      await withKnownIssues(issues).run(async () => {
        const utilityMetersPage = await openBuildingView(globalAdminPage, {
          buildingName: forceGetFromMap(BUILDINGS, getCurrentEnv()),
          featureFlags: {
            utilityMetersTabAvailable: true,
          },
        })
          .then((_) => _.buildingViewSideMenu.openEnergyPage())
          .then((_) => _.openUtilityMetersTab());
        let consumptionMode = await utilityMetersPage.openConsumptionMode();

        consumptionMode = await step('smoke test for utility meters consumption mode', async () => {
          expect(consumptionMode).toBeTruthy();
          consumptionMode = await consumptionMode
            .switchView('Utility units')
            .then((_) => _.switchView('Energy'))
            .then((_) => _.switchView('Intensity'))
            .then((_) => _.switchView('Consumption'))
            .then((_) => _.selectLastYear());

          expect(consumptionMode).toBeTruthy();

          return consumptionMode;
        });

        await step('download table data is successful for the consumption mode', async () => {
          const download = await consumptionMode.downloadTableData();
          expect(download.stats.size).toBeGreaterThan(0);
        });
      });
    });

    test('all components of energy > utility meters, spend mode are loaded', async ({
      globalAdminPage,
      withKnownIssues,
    }) => {
      await withKnownIssues(issues).run(async () => {
        const utilityMetersPage = await openBuildingView(globalAdminPage, {
          buildingName: forceGetFromMap(BUILDINGS, getCurrentEnv()),
          featureFlags: {
            utilityMetersTabAvailable: true,
          },
        })
          .then((_) => _.buildingViewSideMenu.openEnergyPage())
          .then((_) => _.openUtilityMetersTab());
        let spendMode = await utilityMetersPage.openSpendMode();

        spendMode = await step('smoke test for utility meters spend mode', async () => {
          expect(spendMode).toBeTruthy();
          spendMode = await spendMode
            .switchView('Utility units')
            .then((_) => _.switchView('Energy'))
            .then((_) => _.switchView('Intensity'))
            .then((_) => _.switchView('Spend'))
            .then((_) => _.selectLastYear());

          expect(spendMode).toBeTruthy();

          return spendMode;
        });

        await step('download table data is successful for the spend mode', async () => {
          const download = await spendMode.downloadTableData();
          expect(download.stats.size).toBeGreaterThan(0);
        });
      });
    });

    test('all components of energy > utility meters, emissions mode are loaded', async ({
      globalAdminPage,
      withKnownIssues,
    }) => {
      await withKnownIssues(issues).run(async () => {
        const utilityMetersPage = await openBuildingView(globalAdminPage, {
          buildingName: forceGetFromMap(BUILDINGS, getCurrentEnv()),
          featureFlags: {
            utilityMetersTabAvailable: true,
          },
        })
          .then((_) => _.buildingViewSideMenu.openEnergyPage())
          .then((_) => _.openUtilityMetersTab());

        const emissionsMode = await utilityMetersPage
          .openEmissionsMode()
          .then((_) => _.switchView('Intensity'))
          .then((_) => _.switchView('Emissions'))
          .then((_) => _.selectLastYear());

        expect(emissionsMode).toBeTruthy();
      });
    });

    test('header kebab menu navigation items should open correct pages', async ({
      globalAdminPage,
      withKnownIssues,
    }) => {
      await withKnownIssues(issues).run(async () => {
        let energyUtilityMetersPage = await openBuildingView(globalAdminPage, {
          buildingName: forceGetFromMap(BUILDINGS, getCurrentEnv()),
          featureFlags: {
            utilityMetersTabAvailable: true,
          },
        })
          .then((_) => _.buildingViewSideMenu.openEnergyPage())
          .then((_) => _.openUtilityMetersTab());

        const settingsUtilityMetersPage = await energyUtilityMetersPage.thruKebabMenuGoToSettingsUtilityMeters();
        expect(settingsUtilityMetersPage).toBeTruthy();
        energyUtilityMetersPage = await settingsUtilityMetersPage.buildingViewSideMenu.openEnergyPage();

        const settingsWnbPage = await energyUtilityMetersPage.thruKebabMenuGoToWNBSettingsPage();
        expect(settingsWnbPage).toBeTruthy();
      });
    });

    test('all components on energy > energy targets tab should be properly loaded', async ({
      globalAdminPage,
      withKnownIssues,
    }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15770', 'ABOUND-15770');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-15772', 'ABOUND-15772');
      await withKnownIssues(issues).run(async () => {
        const energyEnergyTargetsPage = await openBuildingView(globalAdminPage, {
          buildingName: forceGetFromMap(BUILDINGS, getCurrentEnv()),
          featureFlags: {
            energyTargetsAvailable: true,
          },
        })
          .then((_) => _.buildingViewSideMenu.openEnergyPage())
          .then((_) => _.openEnergyTargetsTab());

        await step('smoke test for the consumption energy target', async () => {
          const consumptionTarget = await energyEnergyTargetsPage.openSubMeterConsumptionTargetEnergyPage();
          const consumptionTargetDetails = await consumptionTarget.getConsumptionTargetDetails();
          const download = await consumptionTarget.downloadTableCsv();

          if (consumptionTargetDetails.targets.length !== 0) {
            expect(download?.stats.size).toBeGreaterThan(0);
          } else {
            expect(download).toBeNull();
          }
        });

        await step('smoke test for the spend energy target', async () => {
          const spendTargetPage = await energyEnergyTargetsPage.openSubMeterSpendTargetEnergyPage();
          const spendTargetDetails = await spendTargetPage.getSpendTargetDetails();
          const download = await spendTargetPage.downloadTableCsv();

          if (spendTargetDetails.targets.length !== 0) {
            expect(download?.stats.size).toBeGreaterThan(0);
          } else {
            expect(download).toBeNull();
          }
        });

        await step('header kebab menu items should have the appropriate content', async () => {
          const expectedKebabActions = ['Go to Sub Meters', 'Go to Energy Target Settings'];

          expect(await energyEnergyTargetsPage.getHeaderKebabMenuItems()).toEqual(expectedKebabActions);
        });

        await step('header kebab menu items should redirect to the appropriate pages', async () => {
          await energyEnergyTargetsPage
            .thruKebabMenuGoToSubMeters()
            .then((p) => p.buildingViewSideMenu.openEnergyPage())
            .then((p) => p.openEnergyTargetsTab())
            .then((p) => p.thruKebabMenuGoToEnergyTargetSettings());
        });
      });
    });

    test('all components on energy > sub meter page should be properly loaded', async ({
      globalAdminPage,
      withKnownIssues,
    }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16338', 'ABOUND-16338');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-17010', 'ABOUND-17010');

      await withKnownIssues(issues).run(async () => {
        const energyEnergySubMeterPage = await openBuildingView(globalAdminPage, {
          buildingName: forceGetFromMap(BUILDINGS, getCurrentEnv()),
          featureFlags: {
            updatedDashboardViewForBuildingSubMeterAvailable: true,
          },
        })
          .then((_) => _.buildingViewSideMenu.openEnergyPage())
          .then((_) => _.openSubMetersTab());

        await step('header kebab menu items should have the appropriate content', async () => {
          const expectedKebabActions = ['Go to Sub Meters'];

          expect(await energyEnergySubMeterPage.getHeaderKebabMenuItems()).toEqual(expectedKebabActions);
        });

        await step('header kebab menu items should redirect to the appropriate pages', async () => {
          await energyEnergySubMeterPage
            .thruKebabMenuGoToSubMeters()
            .then((p) => p.buildingViewSideMenu.openEnergyPage())
            .then((p) => p.openSubMetersTab());
        });

        await step('Navigate to SubMeter LoadAnalysisTab', async () => {
          await (
            await energyEnergySubMeterPage.subMeterTabHeader.switchToConsumptionTargetType()
          ).clickLoadAnalysisTab();
        });

        await step('SubMeter Consumption LoadAnalysisTab', async () => {
          await (
            await (
              await energyEnergySubMeterPage.clickAllUtilityFilter()
            ).subMeterTabHeader.switchToConsumptionTargetType()
          ).clickLoadAnalysisTab();
        });

        await step('SubMeter Spend LoadAnalysisTab', async () => {
          await (
            await (
              await energyEnergySubMeterPage.clickAllUtilityFilter().then((p) => p.clickWaterFilter())
            ).subMeterTabHeader.switchToSpendTargetType()
          ).clickLoadAnalysisTab();
        });
      });
    });
  },
);
