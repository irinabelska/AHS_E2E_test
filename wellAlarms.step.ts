import { expect } from '@playwright/test';

import { AboundAlarm, AlertCenterDeviceType, AlertCenterStatus } from '@/framework/constants/preferenceUnits';
import { GqlTestRunner } from '@/tests/playwright/framework/api/GqlTestRunner';
import { getCriticality, getMetricName } from '@/tests/playwright/framework/utils/enumToType.utils';
import { getPastTimestamp } from '@/tests/playwright/framework/helpers/getPastTimeStamp';

const getActiveAlarmsForBuildingQuery = `
query getActiveAlarmsForBuilding($nodeId: ID!) {
  activeAlarmsForBuilding(buildingId: $nodeId) {
    id
    aboundId
    acknowledgment
    acknowledgedByUserId
    isActive
    criticality
    type
    deviationFromNorm
    currentValue {
      timestamp
      value
    }
    alarmStartTime
    alarmEndedTime
    possibleSolutions
    silence
    snooze
  }
}`;

export async function getActiveAlarmsForBuilding(
  runner: GqlTestRunner,
  buildingId: string,
  customerId: string,
): Promise<AboundAlarm[]> {
  return runner.runTestStep(
    {
      query: getActiveAlarmsForBuildingQuery,
      variables: { nodeId: buildingId },
      customerContext: { customerId },
    },
    async (apiResponse) => {
      const activeAlarmsForBuildingResponse = await apiResponse.json();
      const alarms: AboundAlarm[] = activeAlarmsForBuildingResponse.data.activeAlarmsForBuilding;

      return alarms.map((alarm) => validateAboundAlarm(alarm));
    },
    { stepTitle: 'get active alarms for building' },
  );
}

const getAllWellAlarmsWithFiltersQuery = `
query getAllAlarmsWithFilters($args: AllAlarmsWithFiltersInput!) {
  allAlarmsWithFilters(criteria: $args) {
    list {
      id
      aboundId
      externalAssetId
      type
      isActive
      acknowledgment
      acknowledgedByUserId
      silence
      alarmStartTime
      alarmEndedTime
      criticality
      possibleSolutions
      deviationFromNorm
      label
      snooze
      currentValue {
        timestamp
        value
      }
    }
    count
  }
}`;

export async function getAllWellAlarmsWithFilters(
  runner: GqlTestRunner,
  buildingId: string,
  status: AlertCenterStatus,
  deviceType: AlertCenterDeviceType,
  customerId: string,
): Promise<AboundAlarm[]> {
  const variables = {
    args: {
      buildingId,
      deviceType,
      status,
      spaceIds: [],
      //Same as for calling the query from UI
      fromTimestamp: getPastTimestamp(2).toString(),
    },
  };

  return runner.runTestStep(
    { query: getAllWellAlarmsWithFiltersQuery, variables, customerContext: { customerId } },
    async (apiResponse) => {
      const response = await apiResponse.json();
      const alarmsList = response.data.allAlarmsWithFilters;
      expect(alarmsList.count).toBeGreaterThanOrEqual(0);

      return alarmsList.list.map((alarm: AboundAlarm) => validateAboundAlarm(alarm));
    },
    { stepTitle: `get all well alarms, filters=${JSON.stringify(variables)}` },
  );
}

export function validateAboundAlarm(alarm: AboundAlarm): AboundAlarm {
  return {
    id: alarm.id,
    aboundId: alarm.aboundId,
    acknowledgment: alarm.acknowledgment,
    acknowledgedByUserId: alarm.acknowledgedByUserId,
    isActive: alarm.isActive,
    criticality: getCriticality(alarm.criticality),
    type: getMetricName(alarm.type),
    label: alarm.label,
    deviationFromNorm: alarm.deviationFromNorm,
    externalAssetId: alarm.externalAssetId,
    node: alarm.node,
    currentValue: alarm.currentValue,
    alarmStartTime: alarm.alarmStartTime,
    alarmEndedTime: alarm.alarmEndedTime,
    possibleSolutions: alarm.possibleSolutions,
    properties: alarm.properties,
    silence: alarm.silence,
    snooze: alarm.snooze,
  } as AboundAlarm;
}