import { APIResponse, expect } from '@playwright/test';

import {
  AboundCustomAlarmExtended,
  AlertCenterDeviceType,
  CustomAlarmMetricCriteria,
  AlertCenterStatus,
} from '@/framework/constants/preferenceUnits';
import { GqlTestRunner } from '@/tests/playwright/framework/api/GqlTestRunner';
import { getAlarmState, getLabel, getMetricName } from '@/tests/playwright/framework/utils/enumToType.utils';
import { validateCustomAlert } from '@/tests/playwright/tests/api/abound-alarm-gql/alerts/CustomAlert.type';

const getActiveCustomAlarmsForBuildingQuery = `
  query getActiveCustomAlarmsForBuilding($buildingId: String!) {
    activeCustomAlarmsForBuilding(buildingId: $buildingId) {
      list {
        id
        aboundId
        acknowledgment
        acknowledgedByUserId
        buildingId
        alarmType
        isActive
        alert {
          category
          createdAt
          createdBy
          criticality
          description
          enabled
          id
          name
          notes
          routing {
            targets
            type
          }
          trigger {
            buildingIds
            conditions {
              conditionType
              conditionValues
              metricName
            }
            type
          }
          updatedAt
          updatedBy
        }
        alarmStartTime
        alarmEndedTime
      }
    }
  }`;

export async function getActiveCustomAlarmsForBuilding(
  runner: GqlTestRunner,
  buildingId: string,
  customerId: string,
): Promise<AboundCustomAlarmExtended[]> {
  return runner.runTestStep(
    { query: getActiveCustomAlarmsForBuildingQuery, variables: { buildingId }, customerContext: { customerId } },
    async (apiResponse) => {
      const activeAlarmsForBuildingResponse = await apiResponse.json();
      const alarms: AboundCustomAlarmExtended[] =
        activeAlarmsForBuildingResponse.data.activeCustomAlarmsForBuilding.list;

      return alarms.map((alarm) => validateAboundCustomAlarmExtended(alarm));
    },
    { stepTitle: 'get active alarms for building' },
  );
}

const getAllCustomAlarmsWithFiltersQuery = `
query getAllCustomAlarmsWithFilters($args: AllCustomAlarmsWithFiltersInput!) {
  allCustomAlarmsWithFilters(criteria: $args) {
    list {
      id
      alarmType
      aboundId
      buildingId
      acknowledgment
      acknowledgedByUserId
      isActive
      label
      alert {
        category
        createdAt
        createdBy
        criticality
        description
        enabled
        id
        name
        notes
        routing {
          targets
          type
        }
        trigger {
          buildingIds
          conditions {
            conditionType
            conditionValues
            metricName
          }
          type
        }
        updatedAt
        updatedBy
      }
      alarmStartTime
      alarmEndedTime
    }
    count
  }
}`;

export function getAllCustomAlarmsWithFiltersVariables(
  deviceType: AlertCenterDeviceType,
  status: AlertCenterStatus,
  buildingId: string,
): { args: { buildingId: string; deviceType: AlertCenterDeviceType; status: AlertCenterStatus } } {
  return {
    args: {
      buildingId,
      deviceType,
      status,
    },
  };
}

export function getAllCustomAlarmsWithFilters(
  runner: GqlTestRunner,
  variables: { args: { buildingId: string; deviceType: AlertCenterDeviceType; status: AlertCenterStatus } },
  customerId: string,
): Promise<AboundCustomAlarmExtended[]> {
  return runner.runTestStep(
    { query: getAllCustomAlarmsWithFiltersQuery, variables, customerContext: { customerId } },
    async (apiResponse: APIResponse) => {
      const response = await apiResponse.json();
      const alarmsList = response.data.allCustomAlarmsWithFilters;
      expect(alarmsList.count).toBeGreaterThanOrEqual(0);

      return alarmsList.list.map((alarm: AboundCustomAlarmExtended) => validateAboundCustomAlarmExtended(alarm));
    },
    { stepTitle: `get all custom alarms, filter=${JSON.stringify(variables)}` },
  );
}

export function validateAboundCustomAlarmExtended(alarm: AboundCustomAlarmExtended): AboundCustomAlarmExtended {
  const metricCriteria: CustomAlarmMetricCriteria[] = [];

  if (!alarm.alert) {
    throw Error(`alert is not defined, alarm=${JSON.stringify(alarm)}`);
  }

  const alert = alarm.alert;

  if (alarm.metricCriteria) {
    alarm.metricCriteria.forEach((criteria) => {
      if (criteria) {
        if (!criteria.metricName) {
          throw Error(`metricName is not defined, alarm=${JSON.stringify(alarm)}`);
        }

        metricCriteria.push({
          currentValue: criteria.currentValue,
          deviationFromNormal: criteria.deviationFromNormal,
          metricName: getMetricName(criteria.metricName),
        });
      }
    });
  }

  return {
    id: alarm.id,
    aboundId: alarm.aboundId,
    buildingId: alarm.buildingId,
    alarmType: getAlarmState(alarm.alarmType),
    acknowledgment: alarm.acknowledgment,
    acknowledgedByUserId: alarm.acknowledgedByUserId,
    isActive: alarm.isActive,
    alarmStartTime: alarm.alarmStartTime,
    alarmEndedTime: alarm.alarmEndedTime,
    metricCriteria,
    alert,
  } as AboundCustomAlarmExtended;
}

export function validateCustomAboundAlarmViewModel(alarm: AboundCustomAlarmExtended): AboundCustomAlarmExtended {
  if (!alarm.alert) {
    throw Error(`alert is not defined, alarm=${JSON.stringify(alarm)}`);
  }

  const alert = validateCustomAlert(alarm.alert);

  return {
    id: alarm.id,
    aboundId: alarm.aboundId,
    buildingId: alarm.buildingId,
    isActive: alarm.isActive,
    label: getLabel(alarm.label),
    alarmType: getAlarmState(alarm.alarmType),
    alert,
    alarmStartTime: alarm.alarmStartTime,
    alarmEndedTime: alarm.alarmEndedTime,
    acknowledgment: alarm.acknowledgment,
    acknowledgedByUserId: alarm.acknowledgedByUserId,
  } as AboundCustomAlarmExtended;
}