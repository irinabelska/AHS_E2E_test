import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test, step } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import {
  Building,
  BuildingName,
  getBuildingForDevEnv,
  getBuildingForPreProdEnv,
  getBuildingForQaEnv,
} from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { AuthorizedPage } from '@/tests/playwright/framework/pages/AuthorizedPage';
import { EnergyTargetsPage } from '@/tests/playwright/framework/pages/buildingview/settings/energytargets/EnergyTargetsPage';
import {
  openBuildingView,
  removeConsumptionTargetFromBuilding,
  removeSpendTargetFromBuilding,
} from '@/tests/playwright/tests/test.utils';
import { TargetDefinition } from '@/tests/playwright/framework/pages/buildingview/settings/energytargets/TargetDefinition';
import { EnergyEnergyTargetsPage } from '@/tests/playwright/framework/pages/buildingview/energy/energyTargets/EnergyEnergyTargetsPage';
import { Currencies } from '@/tests/playwright/framework/entities/Currencies';
import { ProfilePage } from '@/tests/playwright/framework/pages/buildingview/settings/profile/ProfilePage';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';

test.describe.configure({ mode: 'serial' });
test.describe(
  'Energy Targets: Journey test',
  {
    tag: ['@regression', '@ui', '@parallel', '@journey'],
  },
  () => {
    const issues: KnownIssue[] = [];

    const BUILDINGS = new Map<Env, Building>([
      [Env.PROD, getBuildingForPreProdEnv(BuildingName.NY_NJ_OFFICE)],
      [Env.PRE_PROD, getBuildingForPreProdEnv(BuildingName.NY_NJ_OFFICE)],
      [Env.QA, getBuildingForQaEnv(BuildingName.ALC_NY_MAIN)],
      [Env.DEV, getBuildingForDevEnv(BuildingName.ALC_NY_MAIN)],
      [Env.LOCAL, getBuildingForDevEnv(BuildingName.ALC_NY_MAIN)],
    ]);

    const BUILDING = forceGetFromMap(BUILDINGS, getCurrentEnv());

    async function openSettingsPage(adminPage: AuthorizedPage): Promise<ProfilePage> {
      return openBuildingView(adminPage, {
        buildingName: BUILDING.name,
        featureFlags: {
          energyTargetsAvailable: true,
        },
      }).then((p) => p.buildingViewSideMenu.openSettingsPage());
    }

    async function openEnergyTargetsSettings(adminPage: AuthorizedPage): Promise<EnergyTargetsPage> {
      return openSettingsPage(adminPage).then((p) => p.settingsSideMenu.openEnergyTargetsPage());
    }

    async function openEnergyPageTargetsTab(adminPage: AuthorizedPage): Promise<EnergyEnergyTargetsPage> {
      return openBuildingView(adminPage, {
        buildingName: BUILDING.name,
        featureFlags: {
          energyTargetsAvailable: true,
        },
      })
        .then((p) => p.buildingViewSideMenu.openEnergyPage())
        .then((p) => p.openEnergyTargetsTab());
    }

    async function setIdenticalCurrencyForUserAndBuilding(adminPage: AuthorizedPage) {
      await openSettingsPage(adminPage)
        .then((_) => _.settingsSideMenu.openUserProfilePage())
        .then((_) => _.setUserCurrency(Currencies.USD))
        .then((_) => _.settingsSideMenu.openEnergyManagementPage())
        .then((_) => _.energyManagementPageTabs.clickSpendAndSpendIntensityTab())
        .then((_) => _.setCurrency(Currencies.USD));
    }

    test.beforeEach('delete all energy targets for tested buildings', async () => {
      await removeConsumptionTargetFromBuilding(BUILDING.id, new Date().getFullYear());
      await removeSpendTargetFromBuilding(BUILDING.id, new Date().getFullYear());
    });

    test('Energy Targets: Consumption target: Building type', async ({ globalAdminPage, withKnownIssues }) => {
      await withKnownIssues(issues).run(async () => {
        allure.description(`Energy Targets are the expected amount of consumed energy.
    The targets can be set on the Settings page per building and then viewed against the actual consumption on the Energy page
    This test will set building type of targets and then will check the values are correctly displayed on the Energy Page`);

        const settingsPageConsumption = await openEnergyTargetsSettings(globalAdminPage)
          .then((p) => p.energyTargetsPageTabs.clickSubMeterTab())
          .then((p) => p.setConsumptionType())
          .then((p) => p.setTargetByBuilding(TargetDefinition.create('consumption', 1234599900)))
          .then((p) => p.getTargets());

        const energyTargetsEnergyPage = await openEnergyPageTargetsTab(globalAdminPage).then((p) =>
          p.openSubMeterConsumptionTargetEnergyPage(),
        );

        energyTargetsEnergyPage.assertTargetsDisplayed();

        const energyPageTargetsConsumption = await energyTargetsEnergyPage.getConsumptionTargetDetails();

        const energyPageTargetsEui = await energyTargetsEnergyPage
          .switchToIntensityView()
          .then((p) => p.getConsumptionTargetDetails());

        expect(settingsPageConsumption.targets[0].annualConsumption?.value).toEqual(
          energyPageTargetsConsumption.targets[0].expectedYtdConsumption?.value,
        );

        expect(settingsPageConsumption.targets[0].byMonthTarget.january.consumption?.value).toEqual(
          energyPageTargetsConsumption.targets[0].byMonthTarget.january.targetUsage?.value,
        );

        expect(settingsPageConsumption.targets[0].annualUsageIntensity?.value).toEqual(
          energyPageTargetsEui.targets[0].expectedYtdConsumption?.value,
        );

        expect(settingsPageConsumption.targets[0].byMonthTarget.january.usageIntensity?.value).toEqual(
          energyPageTargetsEui.targets[0].byMonthTarget.january.targetUsage?.value,
        );
      });
    });

    test('Energy Targets: Consumption target: Utility type', async ({ globalAdminPage, withKnownIssues }) => {
      await withKnownIssues(issues).run(async () => {
        allure.description(
          `This test sets utility consumption targets and checks the values are correctly displayed on the Energy Page`,
        );

        const settingsPageUtilityConsumption = await openEnergyTargetsSettings(globalAdminPage)
          .then((p) => p.energyTargetsPageTabs.clickSubMeterTab())
          .then((p) => p.setConsumptionType())
          .then((p) =>
            p.setTargetByUtility({
              electricity: TargetDefinition.create('consumption', 1000000),
              gas: TargetDefinition.create('consumption', 2000000),
              steam: TargetDefinition.create('consumption', 3000000),
              water: TargetDefinition.create('consumption', 4000000),
            }),
          )
          .then((p) => p.getTargets());

        const energyTargetsEnergyPage = await openEnergyPageTargetsTab(globalAdminPage).then((p) =>
          p.openSubMeterConsumptionTargetEnergyPage(),
        );

        energyTargetsEnergyPage.assertTargetsDisplayed();

        const energyPageTargetsUtilityConsumption = await energyTargetsEnergyPage.getConsumptionTargetDetails();

        const energyPageTargetsUtilityEui = await energyTargetsEnergyPage
          .switchToIntensityView()
          .then((p) => p.getConsumptionTargetDetails());

        const electricSettingsTarget = settingsPageUtilityConsumption.targets[0];
        const gasSettingsTarget = settingsPageUtilityConsumption.targets[1];
        const steamSettingsTarget = settingsPageUtilityConsumption.targets[2];
        const waterSettingsTarget = settingsPageUtilityConsumption.targets[3];

        const electricityConsumptionEnergyPageTarget = energyPageTargetsUtilityConsumption.targets[1];
        const gasConsumptionEnergyPageTarget = energyPageTargetsUtilityConsumption.targets[2];
        const steamConsumptionEnergyPageTarget = energyPageTargetsUtilityConsumption.targets[3];
        const waterConsumptionEnergyPageTarget = energyPageTargetsUtilityConsumption.targets[4];

        const electricityEuiEnergyPageTarget = energyPageTargetsUtilityEui.targets[1];
        const gasEuiEnergyPageTarget = energyPageTargetsUtilityEui.targets[2];
        const steamEuiEnergyPageTarget = energyPageTargetsUtilityEui.targets[3];
        const waterEuiEnergyPageTarget = energyPageTargetsUtilityEui.targets[4];

        expect(electricSettingsTarget.annualConsumption?.value).toEqual(
          electricityConsumptionEnergyPageTarget.expectedYtdConsumption?.value,
        );
        expect(electricSettingsTarget.annualUsageIntensity?.value).toEqual(
          electricityEuiEnergyPageTarget.expectedYtdConsumption?.value,
        );
        expect(electricSettingsTarget.byMonthTarget.may.consumption?.value).toEqual(
          electricityConsumptionEnergyPageTarget.byMonthTarget.may.targetUsage?.value,
        );
        expect(electricSettingsTarget.byMonthTarget.may.usageIntensity?.value).toEqual(
          electricityEuiEnergyPageTarget.byMonthTarget.may.targetUsage?.value,
        );

        expect(gasSettingsTarget.annualConsumption?.value).toEqual(
          gasConsumptionEnergyPageTarget.expectedYtdConsumption?.value,
        );
        expect(gasSettingsTarget.annualUsageIntensity?.value).toEqual(
          gasEuiEnergyPageTarget.expectedYtdConsumption?.value,
        );
        expect(gasSettingsTarget.byMonthTarget.february.consumption?.value).toEqual(
          gasConsumptionEnergyPageTarget.byMonthTarget.february.targetUsage?.value,
        );
        expect(gasSettingsTarget.byMonthTarget.february.usageIntensity?.value).toEqual(
          gasEuiEnergyPageTarget.byMonthTarget.february.targetUsage?.value,
        );

        expect(steamSettingsTarget.annualConsumption?.value).toEqual(
          steamConsumptionEnergyPageTarget.expectedYtdConsumption?.value,
        );
        expect(steamSettingsTarget.annualUsageIntensity?.value).toEqual(
          steamEuiEnergyPageTarget.expectedYtdConsumption?.value,
        );
        expect(steamSettingsTarget.byMonthTarget.march.consumption?.value).toEqual(
          steamConsumptionEnergyPageTarget.byMonthTarget.march.targetUsage?.value,
        );
        expect(steamSettingsTarget.byMonthTarget.march.usageIntensity?.value).toEqual(
          steamEuiEnergyPageTarget.byMonthTarget.march.targetUsage?.value,
        );

        expect(waterSettingsTarget.annualConsumption?.value).toEqual(
          waterConsumptionEnergyPageTarget.expectedYtdConsumption?.value,
        );
        expect(waterSettingsTarget.annualUsageIntensity?.value).toEqual(
          waterEuiEnergyPageTarget.expectedYtdConsumption?.value,
        );
        expect(waterSettingsTarget.byMonthTarget.march.consumption?.value).toEqual(
          waterConsumptionEnergyPageTarget.byMonthTarget.march.targetUsage?.value,
        );
        expect(waterSettingsTarget.byMonthTarget.march.usageIntensity?.value).toEqual(
          waterEuiEnergyPageTarget.byMonthTarget.march.targetUsage?.value,
        );
      });
    });

    test('Energy Targets: Spend target: Building type', async ({ globalAdminPage, withKnownIssues }) => {
      await withKnownIssues(issues).run(async () => {
        allure.description(`Energy Targets are the expected amount of spend money.
    This test sets building type of targets and checks the values are correctly displayed on the Energy Page`);

        await setIdenticalCurrencyForUserAndBuilding(globalAdminPage);

        const settingPageSpendTargets = await openEnergyTargetsSettings(globalAdminPage)
          .then((p) => p.energyTargetsPageTabs.clickSubMeterTab())
          .then((p) => p.setSpendType())
          .then((p) => p.setTargetByBuilding(TargetDefinition.create('spend', 10000000)))
          .then((p) => p.getTargets());

        const energyTargetsEnergyPage = await openEnergyPageTargetsTab(globalAdminPage).then((p) =>
          p.openSubMeterSpendTargetEnergyPage(),
        );

        energyTargetsEnergyPage.assertTargetsDisplayed();

        const energyPageSpendTargets = await energyTargetsEnergyPage.getSpendTargetDetails();

        const energyPageTargetsSpendIntensity = await energyTargetsEnergyPage
          .switchToIntensityView()
          .then((p) => p.getSpendTargetDetails());

        expect(settingPageSpendTargets.targets[0].annualSpend).toEqual(
          energyPageSpendTargets.targets[0].expectedYtdSpend,
        );

        expect(settingPageSpendTargets.targets[0].byMonthTarget.january.spend).toEqual(
          energyPageSpendTargets.targets[0].byMonthTarget.january.targetSpend,
        );

        expect(settingPageSpendTargets.targets[0].annualSpendIntensity?.money).toEqual(
          energyPageTargetsSpendIntensity.targets[0].expectedYtdSpend,
        );

        expect(settingPageSpendTargets.targets[0].byMonthTarget.january.spendIntensity?.money).toEqual(
          energyPageTargetsSpendIntensity.targets[0].byMonthTarget.january.targetSpend,
        );
      });
    });

    test('Energy Targets: Spend target: Utility type', async ({ globalAdminPage, withKnownIssues }) => {
      await withKnownIssues(issues).run(async () => {
        allure.description(
          `This test sets spend utility targets and checks the values are correctly displayed on the Energy Page`,
        );

        await setIdenticalCurrencyForUserAndBuilding(globalAdminPage);

        await step('Spend target: Utility type', async () => {
          const settingsPageUtilitySpend = await openEnergyTargetsSettings(globalAdminPage)
            .then((p) => p.energyTargetsPageTabs.clickSubMeterTab())
            .then((p) => p.setSpendType())
            .then((p) =>
              p.setTargetByUtility({
                electricity: TargetDefinition.create('consumption', 400000),
                gas: TargetDefinition.create('consumption', 300000),
                steam: TargetDefinition.create('consumption', 200000),
                water: TargetDefinition.create('consumption', 100000),
              }),
            )
            .then((p) => p.getTargets());

          const energyTargetsEnergyPage = await openEnergyPageTargetsTab(globalAdminPage).then((p) =>
            p.openSubMeterSpendTargetEnergyPage(),
          );

          energyTargetsEnergyPage.assertTargetsDisplayed();

          const energyPageTargetsUtilitySpend = await energyTargetsEnergyPage.getSpendTargetDetails();

          const energyPageTargetsUtilitySpendIntensity = await energyTargetsEnergyPage
            .switchToIntensityView()
            .then((p) => p.getSpendTargetDetails());

          const electricSettingsTarget = settingsPageUtilitySpend.targets[0];
          const gasSettingsTarget = settingsPageUtilitySpend.targets[1];
          const steamSettingsTarget = settingsPageUtilitySpend.targets[2];
          const waterSettingsTarget = settingsPageUtilitySpend.targets[3];

          const electricitySpendEnergyPageTarget = energyPageTargetsUtilitySpend.targets[1];
          const gasSpendEnergyPageTarget = energyPageTargetsUtilitySpend.targets[2];
          const steamSpendEnergyPageTarget = energyPageTargetsUtilitySpend.targets[3];
          const waterSpendEnergyPageTarget = energyPageTargetsUtilitySpend.targets[4];

          const electricitySpendIntensityEnergyPage = energyPageTargetsUtilitySpendIntensity.targets[1];
          const gasSpendIntensityEnergyPage = energyPageTargetsUtilitySpendIntensity.targets[2];
          const steamSpendIntensityEnergyPage = energyPageTargetsUtilitySpendIntensity.targets[3];
          const waterSpendIntensityEnergyPage = energyPageTargetsUtilitySpendIntensity.targets[4];

          expect(electricSettingsTarget.annualSpend).toEqual(electricitySpendEnergyPageTarget.expectedYtdSpend);
          expect(electricSettingsTarget.annualSpendIntensity?.money).toEqual(
            electricitySpendIntensityEnergyPage.expectedYtdSpend,
          );
          expect(electricSettingsTarget.byMonthTarget.may.spend).toEqual(
            electricitySpendEnergyPageTarget.byMonthTarget.may.targetSpend,
          );
          expect(electricSettingsTarget.byMonthTarget.may.spendIntensity?.money).toEqual(
            electricitySpendIntensityEnergyPage.byMonthTarget.may.targetSpend,
          );

          expect(gasSettingsTarget.annualSpend).toEqual(gasSpendEnergyPageTarget.expectedYtdSpend);
          expect(gasSettingsTarget.annualSpendIntensity?.money).toEqual(gasSpendIntensityEnergyPage.expectedYtdSpend);
          expect(gasSettingsTarget.byMonthTarget.february.spend).toEqual(
            gasSpendEnergyPageTarget.byMonthTarget.february.targetSpend,
          );
          expect(gasSettingsTarget.byMonthTarget.february.spendIntensity?.money).toEqual(
            gasSpendIntensityEnergyPage.byMonthTarget.february.targetSpend,
          );
          expect(steamSettingsTarget.annualSpend).toEqual(steamSpendEnergyPageTarget.expectedYtdSpend);
          expect(steamSettingsTarget.annualSpendIntensity?.money).toEqual(
            steamSpendIntensityEnergyPage.expectedYtdSpend,
          );
          expect(steamSettingsTarget.byMonthTarget.march.spend).toEqual(
            steamSpendEnergyPageTarget.byMonthTarget.march.targetSpend,
          );
          expect(steamSettingsTarget.byMonthTarget.march.spendIntensity?.money).toEqual(
            steamSpendIntensityEnergyPage.byMonthTarget.march.targetSpend,
          );

          expect(waterSettingsTarget.annualSpend).toEqual(waterSpendEnergyPageTarget.expectedYtdSpend);
          expect(waterSettingsTarget.annualSpendIntensity?.money).toEqual(
            waterSpendIntensityEnergyPage.expectedYtdSpend,
          );
          expect(waterSettingsTarget.byMonthTarget.march.spend).toEqual(
            waterSpendEnergyPageTarget.byMonthTarget.march.targetSpend,
          );
          expect(waterSettingsTarget.byMonthTarget.march.spendIntensity?.money).toEqual(
            waterSpendIntensityEnergyPage.byMonthTarget.march.targetSpend,
          );
        });
      });
    });
  },
);
