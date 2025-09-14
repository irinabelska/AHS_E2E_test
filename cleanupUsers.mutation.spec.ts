import { allure } from 'allure-playwright';
import { ContentType } from 'allure-js-commons';

import { getAdminGqlGatewayUrl, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe('cleanup users', () => {
  test.skip(true, 'skipped on purpose so that no-one runs it by mistake');
  const adminGqlGatewayUrl = getAdminGqlGatewayUrl(getCurrentEnv());

  const getUsers = `
query Users($criteria: UserListCriteria) {
  users(criteria: $criteria) {
    id
    name {
      first
      last
    }
  }
}`;

  const getUsersQueryVariables = {
    criteria: {
      offset: 0,
      limit: 1000,
      search: ['e2e'],
    },
  };

  const deleteUserMutation = `
mutation DeleteUser($deleteUserId: ID!) {
  deleteUser(id: $deleteUserId)
}`;

  interface User {
    id: string;
    name: {
      first: string;
      last: string;
    };
  }

  test('delete all users created by e2e tests', async ({ gqlRunnerByGlobalAdmin }, testInfo) => {
    allure.description('```' + getUsers);
    const usersToDelete = await gqlRunnerByGlobalAdmin
      .runQuery({ query: getUsers, variables: getUsersQueryVariables }, { url: adminGqlGatewayUrl })
      .then((response) => response.json())
      .then((response) => response.data.users as User[]);

    await testInfo.attach('usersToDelete', {
      body: JSON.stringify(usersToDelete, null, 2),
      contentType: ContentType.JSON,
    });

    await Promise.all(
      usersToDelete.map(async (userToDelete) => {
        await gqlRunnerByGlobalAdmin.runQuery(
          {
            query: deleteUserMutation,
            variables: {
              deleteUserId: userToDelete.id,
            },
          },
          { url: adminGqlGatewayUrl },
        );
      }),
    );
  });
});
