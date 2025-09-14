/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { expect } from '@playwright/test';

import {
  AlertCategory,
  CreateCustomAlertInput,
  Criticality,
  CustomAlert,
  CustomAlertRoutingInput,
  TriggerType,
  UpdateCustomAlertInput,
} from '@/tests/playwright/framework/constants/preferenceUnits';
import { step, test } from '@/tests/playwright/framework/TestConfig';
import {
  getAllUsersRouting,
  getBuildingsRouting,
  getCustomAlertCreateRequest,
  getSpecificUsersRouting,
  getTrigger,
} from '@/tests/playwright/tests/api/abound-alarm-gql/alerts/CustomAlert.type';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { fetchCustomAlertStep } from '@/tests/playwright/tests/api/abound-alarm-gql/alerts/CustomAlert.steps';
import { getCustomAlertRouteType } from '@/tests/playwright/framework/utils/enumToType.utils';
import { Customer, getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';

test.describe(
  'custom alerts crud',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    interface TestConfig {
      buildingIds: BuildingName[];
      customer: Customer;
    }

    const CONFIG = new Map<Env, TestConfig>([
      [
        Env.LOCAL,
        {
          customer: getCustomerForEnv(CustomerName.CARRIER_CIB, Env.DEV),
          buildingIds: [BuildingName.CIB, BuildingName.EMERALD_CREST_BUILDING],
        },
      ],
      [
        Env.DEV,
        {
          customer: getCustomerForEnv(CustomerName.CARRIER_CIB, Env.DEV),
          buildingIds: [BuildingName.CIB, BuildingName.EMERALD_CREST_BUILDING],
        },
      ],
      [
        Env.QA,
        {
          customer: getCustomerForEnv(CustomerName.CARRIER, Env.QA),
          buildingIds: [BuildingName.CIB, BuildingName.ALC_NY_MAIN],
        },
      ],
      [
        Env.PRE_PROD,
        {
          customer: getCustomerForEnv(CustomerName.CARRIER_CORP, Env.PRE_PROD),
          buildingIds: [BuildingName.CIB, BuildingName.NY_NJ_OFFICE],
        },
      ],
    ]);

    const BUILDING_ABOUND_IDS = forceGetFromMap(CONFIG, getCurrentEnv()).buildingIds.map(
      (id) => getBuildingById(id).id,
    );

    const customerId = forceGetFromMap(CONFIG, getCurrentEnv()).customer.id;

    const customAlertsToCreate: CreateCustomAlertInput[] = [
      getCustomAlertCreateRequest(
        Criticality.Priority_1,
        AlertCategory.Iaq,
        getAllUsersRouting(),
        getTrigger(TriggerType.Space, BUILDING_ABOUND_IDS),
        customerId,
      ),
      getCustomAlertCreateRequest(
        Criticality.Priority_1,
        AlertCategory.Iaq,
        getBuildingsRouting(),
        getTrigger(TriggerType.Space, BUILDING_ABOUND_IDS),
        customerId,
      ),
      getCustomAlertCreateRequest(
        Criticality.Priority_2,
        AlertCategory.Iaq,
        getSpecificUsersRouting(),
        getTrigger(TriggerType.Device, BUILDING_ABOUND_IDS),
        customerId,
      ),
    ];

    const createCustomAlertQuery = `mutation createCustomAlert($alert: CreateCustomAlertInput!) { createCustomAlert(alert: $alert) { id } }`;
    const toggleCustomAlertQuery = `
  mutation ($input: ToggleAlertInput!) {
    toggleAlert(toggleAlertInput: $input) {
      alertId
      enabled
    }
  }`;
    const updateCustomAlert = `mutation updateCustomAlert($alert: UpdateCustomAlertInput!) { updateCustomAlert(alert: $alert) { id }}`;
    const deleteCustomAlertQuery = `mutation deleteCustomAlert($alertId: String!) { deleteCustomAlert(alertId: $alertId) }`;

    function getUpdateCustomAlertInput(alert: CustomAlert): UpdateCustomAlertInput {
      const routing: CustomAlertRoutingInput | null = alert.routing
        ? {
            type: getCustomAlertRouteType(alert.routing.type),
            targets: alert.routing.targets as string[],
          }
        : null;

      return {
        id: alert.id,
        category: alert.category!,
        criticality: alert.criticality!,
        description: alert.description,
        name: alert.name,
        notes: alert.notes,
        trigger: alert.trigger,
        routing,
      };
    }

    test('create, toggle and then delete custom alert', async ({ gqlRunnerByGlobalAdmin }) => {
      const customAlertIds = await step('create custom alerts', async () => {
        return Promise.all(
          customAlertsToCreate.map(async (alert) =>
            gqlRunnerByGlobalAdmin.runTestStep(
              { query: createCustomAlertQuery, variables: { alert }, customerContext: { customerId } },
              async (apiResponse) => {
                const createCustomAlertResponse = await apiResponse.json();
                const customAlertId: string = createCustomAlertResponse.data.createCustomAlert.id;
                expect(customAlertId).toBeDefined();

                return customAlertId;
              },
              { stepTitle: `create custom alert, routingType=${alert.routing?.type}` },
            ),
          ),
        );
      });

      await step('update custom alerts', async () => {
        const customAlert = await fetchCustomAlertStep(gqlRunnerByGlobalAdmin, customAlertIds[0]);

        const alertToUpdate: UpdateCustomAlertInput = {
          ...getUpdateCustomAlertInput(customAlert),
          description: `updated-${customAlert.description}`,
        };

        const response = await gqlRunnerByGlobalAdmin.runQuery(
          { query: updateCustomAlert, variables: { alert: alertToUpdate }, customerContext: { customerId } },
          { stepTitle: `update custom alert, id=${customAlert.id}` },
        );
        const body = await response.json();
        expect(body.errors).toBeUndefined();

        const updatedCustomAlert = await fetchCustomAlertStep(gqlRunnerByGlobalAdmin, customAlert.id);
        expect(updatedCustomAlert.description).toBe(alertToUpdate.description);
      });

      await step('toggle custom alerts', async () => {
        const variables = (alertId: string, enabled: boolean) => ({
          input: {
            alertId: alertId,
            enabled: enabled,
          },
        });
        const toggle = async (alertId: string, enabled: boolean) =>
          gqlRunnerByGlobalAdmin.runTestStep(
            {
              query: toggleCustomAlertQuery,
              variables: variables(alertId, enabled),
              customerContext: { customerId },
            },
            async (apiResponse) => {
              const response = await apiResponse.json();
              expect(response.data.toggleAlert.enabled).toBe(enabled);
            },
            { stepTitle: `toggle custom alert, id=${alertId}, enabled=${enabled}` },
          );

        const fetchExpectingEnabled = async (alertId: string, expectedEnabled: boolean) => {
          const customAlert = await fetchCustomAlertStep(gqlRunnerByGlobalAdmin, alertId);

          expect(customAlert.enabled).toBe(expectedEnabled);
        };

        await Promise.all(customAlertIds.map(async (id) => toggle(id, true)));
        await Promise.all(customAlertIds.map(async (id) => fetchExpectingEnabled(id, true)));
        await Promise.all(customAlertIds.map(async (id) => toggle(id, false)));
        await Promise.all(customAlertIds.map(async (id) => fetchExpectingEnabled(id, false)));
      });

      await step('delete custom alerts', async () => {
        for (const alertId of customAlertIds) {
          await gqlRunnerByGlobalAdmin.runTestStep(
            { query: deleteCustomAlertQuery, variables: { alertId }, customerContext: { customerId } },
            async (apiResponse) => {
              const deleteCustomAlertResponse = await apiResponse.json();
              expect(deleteCustomAlertResponse.data.deleteCustomAlert).toBe('success');
            },
            { stepTitle: `delete custom alert, id=${alertId}` },
          );
        }
      });
    });

    test('in case user has no access to the associated building, exception is thrown', async ({ gqlRunnerByAdmin }) => {
      await gqlRunnerByAdmin.runTestStep(
        {
          query: createCustomAlertQuery,
          variables: { alert: customAlertsToCreate[0] },
          customerContext: { customerId },
        },
        async (apiResponse) => {
          const createCustomAlertResponse = await apiResponse.json();
          const errorMessage: string = createCustomAlertResponse.errors[0].message;

          expect(errorMessage).toEqual('User has no access to at least one of the buildings the alert is related to');
        },
      );
    });
  },
);