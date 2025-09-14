import { allure } from 'allure-playwright';
import { ContentType } from 'allure-js-commons';

import { BuildingName, getBuildingForQaEnv } from '@/tests/playwright/framework/entities/Buildings';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe('cleanup aggregate meters', () => {
  test.skip(true, 'skipped on purpose so that no-one runs it by mistake');

  const getAggregateMetersQuery = `
query getAggregateMeters(
  $buildingId: ID!
) {
  getAggregateMeters(buildingId: $buildingId) {
    id
    name
  }
}`;

  const getAggregateMetersQueryVariables = {
    buildingId: getBuildingForQaEnv(BuildingName.ALC_NY_MAIN).id,
  };

  const deleteAggregateMetersMutation = `
mutation ($id: ID!) {
  deleteAggregateMeterById(id: $id)
}`;

  interface Meter {
    id: string;
    name: string;
  }

  test('delete all aggregate meters created by e2e tests', async ({ gqlRunnerByGlobalAdmin }, testInfo) => {
    allure.description('```' + getAggregateMetersQuery);
    const meters = await gqlRunnerByGlobalAdmin
      .runQuery({ query: getAggregateMetersQuery, variables: getAggregateMetersQueryVariables })
      .then((response) => response.json())
      .then((response) => response.data.getAggregateMeters as Meter[]);

    const metersToDelete = meters.filter((m) => m.name.includes('e2e-'));

    await testInfo.attach('meters-to-delete', {
      body: JSON.stringify(metersToDelete, null, 2),
      contentType: ContentType.JSON,
    });

    await Promise.all(
      metersToDelete.map(async (meterToDelete) => {
        await gqlRunnerByGlobalAdmin.runQuery({
          query: deleteAggregateMetersMutation,
          variables: {
            id: meterToDelete.id,
          },
        });
      }),
    );
  });
});
