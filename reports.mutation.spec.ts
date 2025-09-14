import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { BuildingName, getBuildingById } from '@/tests/playwright/framework/entities/Buildings';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { forceGetFromMap } from '@/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe('reports mutation', () => {
  const BUILDINGS = new Map<Env, BuildingName>([
    [Env.DEV, BuildingName.CIB],
    [Env.QA, BuildingName.CIB],
    [Env.PRE_PROD, BuildingName.CIB],
    [Env.PROD, BuildingName.CAR_CIB],
  ]);

  test('createReport should be called successfully', async ({ gqlRunnerByGlobalAdmin }) => {
    const buildingId = getBuildingById(forceGetFromMap(BUILDINGS, getCurrentEnv())).id;
    const reportName = 'PlaywrightReport';
    const reportTemplateType = 'all_iaq_metrics_vs_occupancy';
    const createReportMutation = `
      mutation CreateReport {
        createReport(
          payload: {
            templateType: ${reportTemplateType},
            name: "${reportName}",
            spaceId: "${buildingId}",
            filterRecentTime: last_24_hours
          }
        )
        {
          id
          templateType
          name
        }
      }
    `;
    let reportId = '';
    await gqlRunnerByGlobalAdmin.runTestStep(
      { query: createReportMutation, variables: {} },
      async (apiResponse: APIResponse) => {
        const response = (await apiResponse.json()) as { data: { createReport: Record<string, unknown> } };
        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('createReport');

        const data = response.data.createReport;
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('templateType', reportTemplateType);
        expect(data).toHaveProperty('name', reportName);
        reportId = data.id as string;
      },
    );

    const deleteReportMutation = `
      mutation DeleteReport {
        deleteReport(reportId: "${reportId}")
      }
    `;

    allure.description('```' + createReportMutation + deleteReportMutation);

    await gqlRunnerByGlobalAdmin.runTestStep(
      { query: deleteReportMutation, variables: {} },
      async (apiResponse: APIResponse) => {
        const response = (await apiResponse.json()) as { data: { deleteReport: boolean } };
        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('deleteReport');

        const data = response.data.deleteReport;
        expect(data).toBe(true);
      },
    );
  });
});
