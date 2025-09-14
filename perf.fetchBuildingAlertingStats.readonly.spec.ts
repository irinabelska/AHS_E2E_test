import fs from 'fs';
import path from 'path';

import { allure } from 'allure-playwright';
import { expect } from '@playwright/test';

import { PerformanceScenario } from '@/tests/playwright/framework/performance/scenario/PerformanceScenario';
import {
  PerformanceScenarioStep,
  PerformanceStepConfig,
} from '@/tests/playwright/framework/performance/scenario/PerformanceScenarioStep';

import { performanceTest as test } from '../../framework/TestConfig';

test.describe('performance fetchBuildingAlertingStats', () => {
  test('performance fetchBuildingAlertingStats', async ({ performanceTestRunner, gqlRunnerByGlobalAdmin }) => {
    const query = `
query {
  fetchBuildingAlertingStats(criticality: [PRIORITY_1, PRIORITY_2], buildingId: "b4d0b9a1-1c1a-449c-b0c2-ab5ac59de481") {
    stats {
      criticality
      customAlertsCount
      latestEventTimestamp
      systemAlertsCount
    }
  }
}`;

    const funcUnderTest = async (): Promise<void> => {
      const apiResponse = await gqlRunnerByGlobalAdmin.runQuery({ query, variables: {} });
      expect(apiResponse.ok()).toBeTruthy();
    };

    const testConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'perf.fetchBuildingAlertingStats.config.json')).toLocaleString(),
    ) as PerformanceStepConfig[];
    const performanceScenario = new PerformanceScenario(
      'fetchBuildingAlertingStats',
      PerformanceScenarioStep.from(testConfig, funcUnderTest),
    );

    allure.description('```' + performanceScenario.toString());
    await performanceTestRunner.run(performanceScenario);
  });
});
