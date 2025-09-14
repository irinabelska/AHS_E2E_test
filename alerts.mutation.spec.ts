import { expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { allure } from 'allure-playwright';

import { AlertCategory, AlertMetricTypes, Criticality } from '@/tests/playwright/framework/constants/preferenceUnits';
import { step, test } from '@/tests/playwright/framework/TestConfig';
import {
  AlertCondition,
  AlertDefinition,
  AlertItemInfo,
  AlertsPage,
  CustomAlertObservationMethod,
  GreaterThanCondition,
  SpecificUsers,
} from '@/tests/playwright/framework/pages/portfolioview/adminsettings/alerts/internal';
import { BuildingName, getBuildingById, getBuildingByName } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { Customer, getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { BuildingStandards } from '@/tests/playwright/framework/entities/BuildingStandards';
import { AlertKebabMenuOption } from '@/tests/playwright/framework/pages/portfolioview/adminsettings/alerts/AlertKebabMenuOption';
import {
  AlertCriticality,
  AlertNineFCriticality,
} from '@/tests/playwright/framework/pages/portfolioview/adminsettings/alerts/createalertmodal/details/AlertCriticality';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { findOrThrow } from '@/tests/playwright/framework/utils/array.utils';

const knownIssues: KnownIssue[] = [];

function getAlert(buildingName: BuildingName): AlertDefinition {
  return {
    title: `e2e-title-${faker.string.alpha(5)}`,
    trigger: {
      category: AlertCategory.Iaq,
      observationMethod: CustomAlertObservationMethod.BY_SPACE,
      buildings: [buildingName],
      conditions: {
        firstCondition: new AlertCondition(AlertMetricTypes.Temperature, new GreaterThanCondition(200), {
          minutes: 10,
        }),
      },
    },
    details: {
      criticality: AlertCriticality.Critical,
      description: `e2e-description-${faker.lorem.sentence()}`,
      //TODO to be modified with usage of real email in case receiving of email verification will be needed
      routing: new SpecificUsers(['itest@carrier.com']),
    },
  };
}

const CONFIGS = new Map<Env, AlertDefinition>([
  [Env.PRE_PROD, getAlert(BuildingName.NY_NJ_OFFICE)],
  [Env.QA, getAlert(BuildingName.ALC_NY_MAIN)],
  [Env.DEV, getAlert(BuildingName.KENNESAW_FACTORY)],
  [Env.LOCAL, getAlert(BuildingName.KENNESAW_FACTORY)],
]);

const ALERT_DEFINITION = forceGetFromMap(CONFIGS, getCurrentEnv());

test.describe(
  'Alerts',
  {
    tag: ['@regression', '@ui'],
  },
  () => {
    test('create/delete and enable/disable custom alert ', async ({ globalAdminPage, withKnownIssues }) => {
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-10863', 'ABOUND-10863');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-10864', 'ABOUND-10864');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-10992', 'ABOUND-10992');
      allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16329', 'ABOUND-16329');

      await withKnownIssues(knownIssues).run(async () => {
        const siteName = getBuildingById(ALERT_DEFINITION.trigger.buildings[0]).site.name;
        const customer = getCustomerForEnv(getBuildingByName(ALERT_DEFINITION.trigger.buildings[0]).site.customerName);

        const portfolioViewPage = await openPortfolioView(globalAdminPage, {
          portfolioAlertManagementAvailable: true,
        });
        const standard = await BuildingStandards.getApiSelectedIaqStandard(customer);
        let alertsPage: AlertsPage = await portfolioViewPage.topBar
          .selectSite(siteName)
          .then((_) => _.portfolioViewSideMenu.openPvAdminSettings(_, globalAdminPage, standard))
          .then(async (_) => {
            return _.settingsTabBar.openAlerts(standard);
          });

        let customAlerts: AlertItemInfo[];

        customAlerts = await alertsPage.getCustomAlerts(20);

        for (const customAlert of customAlerts) {
          if (customAlert.title.includes('e2e')) {
            await alertsPage.modifyAlertFromKebabMenu(customAlert.title, AlertKebabMenuOption.Delete);
          }
        }

        alertsPage = await step('create custom alert', async () => {
          const alertsPageWithCreatedAlert = await alertsPage.createAlertFromDefinition(ALERT_DEFINITION);

          customAlerts = await alertsPageWithCreatedAlert.findAlertsByTitle(ALERT_DEFINITION.title);

          expect(customAlerts[0]).toBeTruthy();

          return alertsPageWithCreatedAlert;
        });

        await step('enable custom alert', async () => {
          await alertsPage.modifyAlertFromKebabMenu(ALERT_DEFINITION.title, AlertKebabMenuOption.Enable);
          customAlerts = await alertsPage.findAlertsByTitle(ALERT_DEFINITION.title);

          expect(customAlerts[0].isTurnedOn).toBeTruthy();
        });

        await step('disable custom alert', async () => {
          await alertsPage.modifyAlertFromKebabMenu(ALERT_DEFINITION.title, AlertKebabMenuOption.Disable);
          customAlerts = await alertsPage.findAlertsByTitle(ALERT_DEFINITION.title);

          expect(customAlerts[0].isTurnedOn).toBeFalsy();
        });

        await step('delete custom alert', async () => {
          await alertsPage.modifyAlertFromKebabMenu(ALERT_DEFINITION.title, AlertKebabMenuOption.Delete);
          customAlerts = await alertsPage.getCustomAlerts();

          expect(customAlerts.find((_) => _.title === ALERT_DEFINITION.title)).toBeFalsy();
        });
      });
    });
  },
);

const customers = new Map<Env, Customer>([
  [Env.DEV, Customer.DEV_CARRIER_CIB],
  [Env.LOCAL, Customer.DEV_CARRIER_CIB],
  [Env.QA, Customer.TEST_QA_1],
  [Env.PRE_PROD, Customer.PREPROD_LINK_LOGISTICS],
  [Env.PROD, Customer.PROD_CARRIER_CORP],
]);

test(
  'Alert page is displayed with NineF Standard',
  {
    tag: ['@setIaqStandardAlc'],
  },
  async ({ globalAdminPage }) => {
    const expectedNineFAlertData = {
      count: 18,
      title: '9F H.E.A.A.L.™',
      category: AlertCategory.Iaq,
      descriptions: [
        {
          description: 'CO₂ above Caution levels',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Limit,
        },
        {
          description: 'CO₂ in the limit range',
          criticality: Criticality.Priority_1,
          nineFCriticality: AlertNineFCriticality.Limit,
        },
        {
          description: 'CO₂ in the limit range',
          criticality: Criticality.Priority_1,
          nineFCriticality: AlertNineFCriticality.Limit,
        },
        {
          description: 'PM2.5 in the limit range',
          criticality: Criticality.Priority_1,
          nineFCriticality: AlertNineFCriticality.Limit,
        },
        {
          description: 'TVOC in the limit range',
          criticality: Criticality.Priority_1,
          nineFCriticality: AlertNineFCriticality.Limit,
        },
        {
          description: 'Humidity in the limit range',
          criticality: Criticality.Priority_1,
          nineFCriticality: AlertNineFCriticality.Limit,
        },
        {
          description: 'Radon in the limit range',
          criticality: Criticality.Priority_1,
          nineFCriticality: AlertNineFCriticality.Limit,
        },
        {
          description: 'Temperature in the limit range',
          criticality: Criticality.Priority_1,
          nineFCriticality: AlertNineFCriticality.Limit,
        },
        {
          description: 'CO₂ in the alert range',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Alert,
        },
        {
          description: 'PM2.5 in the alert range',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Alert,
        },
        {
          description: 'TVOC in the alert range',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Alert,
        },
        {
          description: 'Humidity in the alert range',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Alert,
        },
        {
          description: 'Radon in the alert range',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Alert,
        },
        {
          description: 'Temperature in the alert range',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Alert,
        },
        {
          description: 'CO₂ in the action range',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Action,
        },
        {
          description: 'PM2.5 in the action range',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Action,
        },
        {
          description: 'TVOC in the action range',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Action,
        },
        {
          description: 'Humidity in the action range',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Action,
        },
        {
          description: 'Radon in the action range',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Action,
        },
        {
          description: 'Temperature in the action range',
          criticality: Criticality.Priority_2,
          nineFCriticality: AlertNineFCriticality.Action,
        },
      ],
    };

    const customer = getCustomerForEnv(forceGetFromMap(customers, getCurrentEnv()).name);

    const portfolioViewPage = await openPortfolioView(globalAdminPage, { portfolioBuildingStandardsAvailable: true });

    await BuildingStandards.setApiIaqStandard(BuildingStandards.nineFStandard, customer);

    const alertsPage = await portfolioViewPage.topBar
      .selectCustomer(customer.name)
      .then((_) => _.portfolioViewSideMenu.openPvAdminSettings(_, globalAdminPage, BuildingStandards.nineFStandard))
      .then((_) => _.settingsTabBar.openAlerts(BuildingStandards.nineFStandard));

    const nineFAlerts = await alertsPage.getNineFAlerts();

    expect(nineFAlerts.length).toEqual(expectedNineFAlertData.count);
    nineFAlerts.forEach((alert) => {
      expect(alert.description).toEqual(
        findOrThrow(expectedNineFAlertData.descriptions, (_) => _.description === alert.description).description,
      );
      expect(alert.criticality, `Criticality for alert ${alert.description} was incorrect`).toEqual(
        findOrThrow(expectedNineFAlertData.descriptions, (_) => _.description === alert.description).criticality,
      );
      expect(alert.nineFCriticality, `Nine F criticality for alert ${alert.description} was incorrect`).toEqual(
        findOrThrow(expectedNineFAlertData.descriptions, (_) => _.description === alert.description).nineFCriticality,
      );
      expect(alert.title, `Title for alert ${alert.description} was incorrect`).toEqual(expectedNineFAlertData.title);
      expect(alert.category, `Category for alert ${alert.description} was incorrect`).toEqual(
        expectedNineFAlertData.category,
      );
      expect(alert.routing, `Routing for alert ${alert.description} was incorrect`).toBeTruthy();
      expect(alert.isToggleVisible, `Toggle visibility for alert ${alert.description} was incorrect`).toBeTruthy();
      expect(alert.isEnabled, `Alert ${alert.description} is not enabled`).toBeTruthy();
    });

    const customAlerts = await alertsPage.getCustomAlerts();
    expect(customAlerts).toBeTruthy();

    for (const alert of customAlerts) {
      expect(alert.description).toBeTruthy();
      expect(alert.title).toBeTruthy();
      expect(alert.criticality).toBeTruthy();
      expect(alert.category).toBeTruthy();
      expect(alert.routing).toBeTruthy();
      expect(alert.isToggleVisible).toBeTruthy();
    }
  },
);

test(
  'Alert page is displayed with Well Standard',
  {
    tag: ['@setIaqStandardAlc'],
  },
  async ({ globalAdminPage }) => {
    const expectedWellAlertData = {
      count: 12,
      title: 'WELL v2',
      category: AlertCategory.Iaq,
      descriptions: [
        { description: 'CO₂ above Caution levels', criticality: Criticality.Priority_2 },
        { description: 'Humidity above Caution levels', criticality: Criticality.Priority_2 },
        { description: 'PM2.5 above Caution levels', criticality: Criticality.Priority_2 },
        { description: 'Radon above Caution levels', criticality: Criticality.Priority_2 },
        { description: 'Temperature above Caution levels', criticality: Criticality.Priority_2 },
        { description: 'TVOC above Caution levels', criticality: Criticality.Priority_2 },
        { description: 'CO₂ above Critical levels', criticality: Criticality.Priority_1 },
        { description: 'Humidity above Critical levels', criticality: Criticality.Priority_1 },
        { description: 'PM2.5 above Critical levels', criticality: Criticality.Priority_1 },
        { description: 'Radon above Critical levels', criticality: Criticality.Priority_1 },
        { description: 'Temperature above Critical levels', criticality: Criticality.Priority_1 },
        { description: 'TVOC above Critical levels', criticality: Criticality.Priority_1 },
      ],
    };

    const customer = getCustomerForEnv(forceGetFromMap(customers, getCurrentEnv()).name);
    await BuildingStandards.setApiIaqStandard(BuildingStandards.wellStandard, customer);

    const alertsPage = await openPortfolioView(globalAdminPage, { portfolioEnergyUtilitiesAvailable: true })
      .then((_) => _.topBar.selectCustomer(customer.name))
      .then((_) => _.portfolioViewSideMenu.openPvAdminSettings(_, globalAdminPage, BuildingStandards.wellStandard))
      .then((_) => _.settingsTabBar.openAlerts(BuildingStandards.wellStandard));

    const wellAlerts = await alertsPage.getWellAlerts();

    expect(wellAlerts.length).toEqual(expectedWellAlertData.count);
    wellAlerts.forEach((alert) => {
      expect(alert.description).toEqual(
        findOrThrow(expectedWellAlertData.descriptions, (_) => _.description === alert.description).description,
      );
      expect(alert.criticality, `Criticality for alert ${alert.description} was incorrect`).toEqual(
        findOrThrow(expectedWellAlertData.descriptions, (_) => _.description === alert.description).criticality,
      );
      expect(alert.title, `Title for alert ${alert.description} was incorrect`).toEqual(expectedWellAlertData.title);
      expect(alert.category, `Category for alert ${alert.description} was incorrect`).toEqual(
        expectedWellAlertData.category,
      );
      expect(alert.routing, `Routing for alert ${alert.description} was incorrect`).toBeTruthy();
      expect(alert.isToggleVisible, `Toggle visibility for alert ${alert.description} was incorrect`).toBeTruthy();
      expect(alert.isEnabled, `Alert ${alert.description} is not enabled`).toBeTruthy();
    });

    const customAlerts = await alertsPage.getCustomAlerts();
    expect(customAlerts).toBeTruthy();

    for (const alert of customAlerts) {
      expect(alert.description).toBeTruthy();
      expect(alert.title).toBeTruthy();
      expect(alert.criticality).toBeTruthy();
      expect(alert.category).toBeTruthy();
      expect(alert.routing).toBeTruthy();
      expect(alert.isToggleVisible).toBeTruthy();
    }
  },
);
