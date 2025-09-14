import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import _ from 'lodash';

import {
  fetchWellAlertsResponse,
  WellAlert,
  WellAlertSource,
} from '@/tests/playwright/tests/api/abound-alarm-gql/alerts/WellAlert.type';
import { logger, test } from '@/tests/playwright/framework/TestConfig';
import { BuildingStandards } from '@/tests/playwright/framework/entities/BuildingStandards';
import { forceGetFromMap } from '@/framework/utils/map.utils';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { Customer } from '@/tests/playwright/framework/entities/Customer';

import { expectedNineFAlerts, getStandard9FAlertsResponse, NineFAlert, NineFAlertSource } from './NineFAlert.type';

test.describe('nine f alerts', () => {
  const customers = new Map<Env, Customer>([
    [Env.DEV, Customer.DEV_CARRIER_CIB],
    [Env.LOCAL, Customer.DEV_CARRIER_CIB],
    [Env.QA, Customer.QA_CARRIER],
    [Env.PRE_PROD, Customer.PREPROD_LINK_LOGISTICS],
    [Env.PROD, Customer.PROD_CARRIER_CORP],
  ]);

  const timeoutForToggleIaqStandardLambda = 10_000;

  const fetchWellAlerts = `
    query fetchWellAlerts($customerId: String!) {
      fetchWellAlerts(customerId: $customerId) {
        criticality
        metricType
        enabled
        customerId
      }
    }
  `;

  const standard9FAlerts = `
    query standard9FAlerts($customerId: ID!) {
      standard9FAlerts(customerId: $customerId) {
        criticality
        metricType
        enabled
        customerId
      }
    }
  `;

  const customer = forceGetFromMap(customers, getCurrentEnv());
  const customerId = customer.id;

  const arraysOfAlertsAreEqual = <T>(firstArray: T[], secondArray: T[]): boolean => {
    if (firstArray.length !== secondArray.length) {
      return false;
    }

    return firstArray.every((firstArrayItem) =>
      secondArray.some((secondArrayItem) => _.isEqual(firstArrayItem, secondArrayItem)),
    );
  };

  test('get nine f & well alerts after turning ON & OFF nine f standard', async ({ gqlRunnerByGlobalAdmin }) => {
    test.skip(true, '9F mutation tests that turn on 9F IAQ standard should be skipped due to 9F feature is off');

    allure.link('https://carrier-digital.atlassian.net/browse/CARRIERIO-21473', 'CARRIERIO-21473');
    allure.description('```' + standard9FAlerts);

    const getWellAlerts = async (): Promise<WellAlert[]> => {
      try {
        const apiResponse: APIResponse = await gqlRunnerByGlobalAdmin.runQuery(
          { query: fetchWellAlerts, variables: { customerId: customerId } },
          { stepTitle: 'fetch well alerts' },
        );

        const fetchWellAlertsResponse: fetchWellAlertsResponse = await apiResponse.json();

        return fetchWellAlertsResponse.data.fetchWellAlerts.map((wellAlert: WellAlertSource) =>
          WellAlert.create(wellAlert),
        );
      } catch (error) {
        logger.error('Error fetching Well alerts:', error);
        throw error;
      }
    };

    const getNineFAlerts = async (): Promise<NineFAlert[]> => {
      try {
        const apiResponse: APIResponse = await gqlRunnerByGlobalAdmin.runQuery(
          { query: standard9FAlerts, variables: { customerId: customerId } },
          { stepTitle: 'fetch nine f alerts' },
        );

        const getNineFAlertsResponse: getStandard9FAlertsResponse = await apiResponse.json();

        return getNineFAlertsResponse.data.standard9FAlerts.map((nineFAlert: NineFAlertSource) =>
          NineFAlert.create(nineFAlert),
        );
      } catch (error) {
        logger.error('Error fetching Nine F alerts:', error);
        throw error;
      }
    };

    const validateNineFAlerts = async () => {
      await expect(async () => {
        const actualNineFAlerts = await getNineFAlerts();

        expect(actualNineFAlerts.length).toBe(expectedNineFAlerts.length);

        for (const expectedNineFAlert of expectedNineFAlerts) {
          const alert = actualNineFAlerts.filter(
            (actualAlert) =>
              actualAlert.metricType === expectedNineFAlert.metricType &&
              actualAlert.criticality === expectedNineFAlert.criticality &&
              actualAlert.enabled === expectedNineFAlert.enabled &&
              actualAlert.customerId === expectedNineFAlert.customerId,
          );

          expect(alert.length).toEqual(1);
          expect(alert[0].enabled).toEqual(expectedNineFAlert.enabled);
          expect(alert[0].customerId).toEqual(expectedNineFAlert.customerId);
        }
      }).toPass({
        timeout: timeoutForToggleIaqStandardLambda,
      });
    };

    const wellAlertsHaveNotBeenChanged = async (initialWellAlerts: WellAlert[]) => {
      const wellAlertsAfterSwitchingStandard: WellAlert[] = await getWellAlerts();
      const wellAlertsHaveNotBeenChanged = arraysOfAlertsAreEqual(initialWellAlerts, wellAlertsAfterSwitchingStandard);

      expect(wellAlertsHaveNotBeenChanged).toBe(true);
    };

    const nineFAlertsHaveNotBeenChanged = async (initialNineFAlerts: NineFAlert[]) => {
      await expect(async () => {
        const nineFAlertsAfterSwitchingStandard: NineFAlert[] = await getNineFAlerts();

        expect(nineFAlertsAfterSwitchingStandard.length).toBe(expectedNineFAlerts.length);

        const nineFAlertsHaveNotBeenChanged = arraysOfAlertsAreEqual(
          nineFAlertsAfterSwitchingStandard,
          initialNineFAlerts,
        );
        expect(nineFAlertsHaveNotBeenChanged).toBe(true);
      }).toPass({
        timeout: timeoutForToggleIaqStandardLambda,
      });
    };

    const standard = await BuildingStandards.getApiSelectedIaqStandard(customer);
    const initialWellAlerts: WellAlert[] = await getWellAlerts();

    if (standard === BuildingStandards.wellStandard) {
      await test.step('turn on and then turn off nine f standard', async () => {
        await BuildingStandards.setApiIaqStandard(BuildingStandards.nineFStandard, customer);

        await validateNineFAlerts();
        await wellAlertsHaveNotBeenChanged(initialWellAlerts);

        await BuildingStandards.setApiIaqStandard(BuildingStandards.wellStandard, customer);

        await wellAlertsHaveNotBeenChanged(initialWellAlerts);
        await nineFAlertsHaveNotBeenChanged(expectedNineFAlerts);

        await BuildingStandards.setApiIaqStandard(BuildingStandards.nineFStandard, customer);
      });
    } else if (standard === BuildingStandards.nineFStandard) {
      await test.step('turn off and then turn on nine f standard', async () => {
        await validateNineFAlerts();

        await BuildingStandards.setApiIaqStandard(BuildingStandards.wellStandard, customer);

        await wellAlertsHaveNotBeenChanged(initialWellAlerts);

        await BuildingStandards.setApiIaqStandard(BuildingStandards.nineFStandard, customer);

        await nineFAlertsHaveNotBeenChanged(expectedNineFAlerts);
        await wellAlertsHaveNotBeenChanged(initialWellAlerts);

        await BuildingStandards.setApiIaqStandard(BuildingStandards.wellStandard, customer);
      });
    }
  });
});
