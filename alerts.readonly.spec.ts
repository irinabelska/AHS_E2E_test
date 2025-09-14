import { expect } from '@playwright/test';

import { AlertCategory, Criticality } from '@/tests/playwright/framework/constants/preferenceUnits';
import { test } from '@/tests/playwright/framework/TestConfig';
import { openPortfolioView } from '@/tests/playwright/tests/test.utils';
import { BuildingStandards } from '@/tests/playwright/framework/entities/BuildingStandards';
import { Customer, getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { findOrThrow } from '@/tests/playwright/framework/utils/array.utils';
import { AlertNineFCriticality } from '@/tests/playwright/framework/pages/portfolioview/adminsettings/alerts/createalertmodal/details/AlertCriticality';

test.describe('Admin Settings', () => {
  test.describe(
    'Alerts',
    {
      tag: ['@regression', '@ui', '@parallel'],
    },
    () => {
      const customers = new Map<Env, Customer>([
        [Env.DEV, Customer.DEV_CARRIER_CIB],
        [Env.LOCAL, Customer.DEV_CARRIER_CIB],
        [Env.QA, Customer.QA_CARRIER],
        [Env.PRE_PROD, Customer.PREPROD_LINK_LOGISTICS],
        [Env.PROD, Customer.PROD_LINK_LOGISTICS],
      ]);

      test('Alert page displays with currently selected Standard', async ({ globalAdminPage }) => {
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

        const standard = await BuildingStandards.getApiSelectedIaqStandard(forceGetFromMap(customers, getCurrentEnv()));
        const customer = getCustomerForEnv(forceGetFromMap(customers, getCurrentEnv()).name);

        const portfolioView = await openPortfolioView(globalAdminPage, {
          portfolioAlertManagementAvailable: true,
        });
        const standard = await BuildingStandards.getApiSelectedIaqStandard(forceGetFromMap(customers, getCurrentEnv()));

        const alertsPage = await portfolioView.topBar
          .selectCustomer(customer.name)
          .then((_) => _.portfolioViewSideMenu.openPvAdminSettings(_, globalAdminPage, standard))
          .then((_) => _.settingsTabBar.openAlerts(standard));

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

        if (standard === BuildingStandards.wellStandard) {
          const wellAlerts = await alertsPage.getWellAlerts();

          expect(wellAlerts.length).toEqual(expectedWellAlertData.count);

          wellAlerts.forEach((alert) => {
            expect(alert.description).toEqual(
              findOrThrow(expectedWellAlertData.descriptions, (_) => _.description === alert.description).description,
            );
            expect(alert.criticality, `Criticality for alert ${alert.description} was incorrect`).toEqual(
              findOrThrow(expectedWellAlertData.descriptions, (_) => _.description === alert.description).criticality,
            );
            expect(alert.title, `Title for alert ${alert.description} was incorrect`).toEqual(
              expectedWellAlertData.title,
            );
            expect(alert.category, `Category for alert ${alert.description} was incorrect`).toEqual(
              expectedWellAlertData.category,
            );
            expect(alert.routing, `Routing for alert ${alert.description} was incorrect`).toBeTruthy();
            expect(
              alert.isToggleVisible,
              `Toggle visibility for alert ${alert.description} was incorrect`,
            ).toBeTruthy();
            expect(alert.isEnabled, `Alert ${alert.description} is not enabled`).toBeTruthy();
          });
        }

        if (standard === BuildingStandards.nineFStandard) {
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
              findOrThrow(expectedNineFAlertData.descriptions, (_) => _.description === alert.description)
                .nineFCriticality,
            );
            expect(alert.title, `Title for alert ${alert.description} was incorrect`).toEqual(
              expectedNineFAlertData.title,
            );
            expect(alert.category, `Category for alert ${alert.description} was incorrect`).toEqual(
              expectedNineFAlertData.category,
            );
            expect(alert.routing, `Routing for alert ${alert.description} was incorrect`).toBeTruthy();
            expect(
              alert.isToggleVisible,
              `Toggle visibility for alert ${alert.description} was incorrect`,
            ).toBeTruthy();
            expect(alert.isEnabled, `Alert ${alert.description} is not enabled`).toBeTruthy();
          });
        }
      });
    },
  );
});
