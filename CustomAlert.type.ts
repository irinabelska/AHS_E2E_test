import { faker } from '@faker-js/faker';

import {
  AlertCategory,
  AlertMetricTypes,
  AlertTrigger,
  CreateCustomAlertInput,
  Criticality,
  CustomAlert,
  CustomAlertRouteType,
  CustomAlertRouting,
  CustomAlertRoutingInput,
  CustomAlertTriggerInput,
  FetchCustomAlert,
  TriggerCondition,
  TriggerConditionType,
  TriggerType,
} from '@/tests/playwright/framework/constants/preferenceUnits';
import {
  getAlertMetricTypes,
  getCustomAlertCategory,
  getCustomAlertConditionType,
  getCustomAlertCriticalityType,
  getCustomAlertRouteType,
  getCustomAlertTriggerType,
} from '@/tests/playwright/framework/utils/enumToType.utils';

export const getAllUsersRouting = (): CustomAlertRoutingInput => ({
  type: CustomAlertRouteType.AllUsers,
  targets: [],
});

export const getBuildingsRouting = (): CustomAlertRoutingInput => ({
  type: CustomAlertRouteType.Buildings,
  targets: null,
});

export const getSpecificUsersRouting = (): CustomAlertRoutingInput => ({
  type: CustomAlertRouteType.SpecificUsers,
  targets: [faker.internet.email(), faker.internet.email()],
});

export const getTrigger = (type: TriggerType, buildingIds: string[]): AlertTrigger =>
  ({
    type,
    buildingIds,

    conditions: [
      {
        metricName: AlertMetricTypes.Temperature,
        conditionType: TriggerConditionType.LessThan,
        conditionValues: [0],
        durationTime: 10_000,
      },
    ],
  }) as AlertTrigger;

export const getCustomAlertCreateRequest = (
  criticality: Criticality,
  category: AlertCategory,
  routing: CustomAlertRoutingInput,
  trigger: CustomAlertTriggerInput,
  customerId: string,
): CreateCustomAlertInput => ({
  customerId,
  name: faker.lorem.words(2),
  description: faker.lorem.words(10),
  notes: faker.lorem.words(10),
  criticality,
  category,
  routing,
  trigger,
  uploadFiles: [],
});

export function validateFetchCustomAlert(alert: FetchCustomAlert): FetchCustomAlert {
  if (!alert.category) {
    throw Error(`category is not defined, alert=${JSON.stringify(alert)}`);
  }

  if (!alert.userPermissions) {
    throw Error(`userPermissions are not defined, alert=${JSON.stringify(alert)}`);
  }

  return {
    id: alert.id,
    name: alert.name,
    notes: alert.notes,
    category: getCustomAlertCategory(alert.category),
    createdAt: alert.createdAt,
    createdBy: alert.createdBy,
    criticality: getCustomAlertCriticalityType(alert.criticality),
    description: alert.description,
    enabled: alert.enabled,
    userPermissions: alert.userPermissions,
    updatedAt: alert.updatedAt,
    updatedBy: alert.updatedBy,
  } as FetchCustomAlert;
}

export function validateCustomAlert(alert: CustomAlert): CustomAlert {
  if (!alert.category) {
    throw Error(`category is not defined, alert=${JSON.stringify(alert)}`);
  }

  const trigger = alert.trigger
    ? ({
        type: getCustomAlertTriggerType(alert.trigger.type),
        buildingIds: alert.trigger.buildingIds,
        conditions: alert.trigger.conditions.map(
          (condition) =>
            ({
              metricName: getAlertMetricTypes(condition.metricName),
              conditionType: getCustomAlertConditionType(condition.conditionType),
              conditionValues: condition.conditionValues,
              durationTime: condition.durationTime,
            }) as TriggerCondition,
        ),
      } as AlertTrigger)
    : undefined;

  const routing = alert.routing
    ? ({
        type: getCustomAlertRouteType(alert.routing.type),
        targets: alert.routing.targets,
      } as CustomAlertRouting)
    : undefined;

  if (alert.enabled && !alert.criticality) {
    throw Error(`criticality is not defined, alert=${JSON.stringify(alert)}`);
  }

  return {
    id: alert.id,
    name: alert.name,
    notes: alert.notes,
    category: getCustomAlertCategory(alert.category),
    createdAt: alert.createdAt,
    createdBy: alert.createdBy,
    createdByUserName: alert.createdByUserName,
    criticality: getCustomAlertCriticalityType(alert.criticality),
    description: alert.description,
    enabled: alert.enabled,
    updatedAt: alert.updatedAt,
    updatedBy: alert.updatedBy,
    trigger,
    routing,
  } as CustomAlert;
}