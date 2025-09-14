import { APIResponse } from '@playwright/test';

import { CustomAlert, TriggerCondition, AlertTrigger } from '@/tests/playwright/framework/constants/preferenceUnits';
import { GqlTestRunner } from '@/tests/playwright/framework/api/GqlTestRunner';
import {
  getAlertMetricTypes,
  getCustomAlertCategory,
  getCustomAlertConditionType,
  getCustomAlertCriticalityType,
  getCustomAlertRouteType,
  getCustomAlertTriggerType,
} from '@/tests/playwright/framework/utils/enumToType.utils';

const fetchCustomAlertQuery = `
  query fetchCustomAlert($customAlertId: String!) {
    fetchCustomAlert(customAlertId: $customAlertId) {
      id
      name
      notes
      description
      criticality
      category
      enabled
      routing {
        type
        targets
      }
      trigger {
        type
        buildingIds
        conditions {
          metricName
          conditionType
          conditionValues
          durationTime
        }
      }
      createdAt
      createdBy
      updatedAt
      updatedBy
      createdByUserName
    }
  }
`;

export function fetchCustomAlertStep(runner: GqlTestRunner, customAlertId: string): Promise<CustomAlert> {
  return runner.runTestStep(
    { query: fetchCustomAlertQuery, variables: { customAlertId } },
    async (apiResponse) => createCustomAlertFromResponse(apiResponse),
    { stepTitle: `fetch custom alert, id=${customAlertId}` },
  );
}

async function createCustomAlertFromResponse(apiResponse: APIResponse): Promise<CustomAlert> {
  const response = await apiResponse.json();
  const alert = response.data.fetchCustomAlert;

  return {
    category: getCustomAlertCategory(alert.category),
    createdAt: alert.createdAt,
    createdBy: alert.createdBy,
    createdByUserName: alert.createdByUserName,
    criticality: getCustomAlertCriticalityType(alert.criticality),
    description: alert.description,
    enabled: alert.enabled,
    id: alert.id,
    name: alert.name,
    notes: alert.notes,
    routing: {
      targets: alert.routing.targets,
      type: getCustomAlertRouteType(alert.routing.type),
    },
    trigger: {
      buildingIds: alert.trigger.buildingIds,
      conditions: alert.trigger.conditions.map((condition: TriggerCondition) => ({
        conditionType: getCustomAlertConditionType(condition.conditionType),
        conditionValues: condition.conditionValues,
        durationTime: condition.durationTime,
        metricName: getAlertMetricTypes(condition.metricName),
      })),
      type: getCustomAlertTriggerType(alert.trigger.type),
    } as AlertTrigger,
    updatedAt: alert.updatedAt,
    updatedBy: alert.updatedBy,
  };
}