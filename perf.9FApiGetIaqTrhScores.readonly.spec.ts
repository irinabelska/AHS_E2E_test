import fs from 'fs';
import path from 'path';

import { allure } from 'allure-playwright';

import { PerformanceScenario } from '@/tests/playwright/framework/performance/scenario/PerformanceScenario';
import {
  PerformanceScenarioStep,
  PerformanceStepConfig,
} from '@/tests/playwright/framework/performance/scenario/PerformanceScenarioStep';

import { performanceTest as test } from '../../framework/TestConfig';

test.describe('performance 9F API', () => {
  test('performance 9F API', async ({ performanceTestRunner, nineFApiClient }) => {
    const bodyBuildingDaily = `
{
    "buildingId": "notExistingBuildingId",
    "customerId": "notExistingCustomerId",
    "spaceType": "BUILDING",
    "totalOpenHours": 12.0,
    "metrics": [
        {
            "metricType": "TRH",
            "average": -1,
            "numberOfExpectedValues": 57600,
            "thresholdStats": [0, 28800, 28800, 0, 0]
        },
        {
            "metricType": "CO2",
            "average": 1075.0,
             "numberOfExpectedValues": 57600,
            "thresholdStats": [0, 28800, 28800, 0, 0]
        },
        {
            "metricType": "PM2.5",
            "average": 17.5,
           "numberOfExpectedValues": 57600,
            "thresholdStats": [0, 28800, 28800, 0, 0]
        },
        {
            "metricType": "TVOC",
            "average": 1075.0,
           "numberOfExpectedValues": 57600,
            "thresholdStats": [0, 28800, 28800, 0, 0]
        },
        {
            "metricType": "TEMP",
            "average": 73.1,
            "numberOfExpectedValues": 57600,
            "thresholdStats": [0, 28800, 28800, 0, 0]
        },
        {
            "metricType": "RH",
            "average": 44.8,
            "numberOfExpectedValues": 57600,
            "thresholdStats": [0, 28800, 28800, 0, 0]
        },
         {
            "metricType": "RADON",
            "average": 1.2,
             "numberOfExpectedValues": 57600,
            "thresholdStats": [0, 28800, 28800, 0, 0]
        }
    ]
}`;

    const funcUnderTest = async (): Promise<void> => {
      const res = await nineFApiClient.get9FScores(bodyBuildingDaily);
      await performanceTestRunner.performance.captureNetworkResponse(res);
    };

    const testConfig = JSON.parse(
      fs.readFileSync(path.join('src/tests/playwright/tests/performance/', 'perf.9FApi.config.json')).toLocaleString(),
    ) as PerformanceStepConfig[];
    const performanceScenario = new PerformanceScenario(
      'nineFGetScores',
      PerformanceScenarioStep.from(testConfig, funcUnderTest),
    );

    allure.description('```' + performanceScenario.toString());
    await performanceTestRunner.run(performanceScenario);
  });
});
