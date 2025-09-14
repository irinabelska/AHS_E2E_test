import { allure } from 'allure-playwright';
import { ContentType } from 'allure-js-commons';

import { BuildingName, getBuildingForQaEnv } from '@/tests/playwright/framework/entities/Buildings';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe('cleanup Reports', () => {
  test.skip(true, 'skipped on purpose so that no-one runs it by mistake');

  const getReportsQuery = `
query fetchReports($filterPayload: FetchReportsInput!) {
  fetchReports(filterPayload: $filterPayload) {
    items {
      id
      name
    }
  }
}`;

  const getReportsQueryVariables = {
    filterPayload: {
      limit: 1000,
      offset: 0,
      orderBy: 'viewedAt',
      orderDirection: 'desc',
      scope: 'portfolio',
      rootBuildingId: getBuildingForQaEnv(BuildingName.ALC_NY_MAIN).id,
    },
  };

  const deleteReportMutation = `
mutation deleteReport($reportId: String!) {
  deleteReport(reportId: $reportId)
}`;

  interface Report {
    id: string;
    name: string;
  }

  test('delete reports created by e2e tests', async ({ gqlRunnerByGlobalAdmin }, testInfo) => {
    allure.description('```' + getReportsQuery);
    const reports = await gqlRunnerByGlobalAdmin
      .runQuery({ query: getReportsQuery, variables: getReportsQueryVariables })
      .then((response) => response.json())
      .then((response) => response.data.fetchReports.items as Report[]);

    const reportsToDelete = reports.filter((r) => r.name.includes('e2e-'));

    await testInfo.attach('reports-to-delete', {
      body: JSON.stringify(reportsToDelete, null, 2),
      contentType: ContentType.JSON,
    });

    await Promise.all(
      reportsToDelete.map(async (reportToDelete) => {
        await gqlRunnerByGlobalAdmin.runQuery({
          query: deleteReportMutation,
          variables: {
            reportId: reportToDelete.id,
          },
        });
      }),
    );
  });
});
