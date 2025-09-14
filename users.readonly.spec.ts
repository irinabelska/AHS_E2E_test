import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { getAdminGqlGatewayUrl, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { GqlTestRunner } from '@/tests/playwright/framework/api/GqlTestRunner';
import { ApiErrorResponse } from '@/tests/playwright/framework/api/ApiErrorResponse';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe('users api', () => {
  const GQL_OPTS = { url: getAdminGqlGatewayUrl(getCurrentEnv()) };

  const usersQuery = `
    query {
      users(criteria: { limit: 10, offset: 0 }) {
        id
        name {
          first
          last
        }
        role
        email
      }
    }`;

  interface User {
    id: string;
    name: {
      first: string;
      last: string;
    };
    role: string;
    email: string;
  }

  async function getUsers(gqlRunner: GqlTestRunner) {
    return gqlRunner.runTestStep(
      { query: usersQuery },
      async (apiResponse: APIResponse): Promise<User[]> => {
        const response = (await apiResponse.json()) as { data: { users: User[] } };
        const users = response.data.users;

        users.forEach((user) => {
          expect(user.id).not.toBeNull();
          expect(user.role).not.toBeNull();
        });

        return users;
      },
      { ...GQL_OPTS, stepTitle: 'get-users' },
    );
  }

  async function getUsersUnauthorized(gqlRunner: GqlTestRunner) {
    return gqlRunner.runTestStep(
      { query: usersQuery },
      async (apiResponse: APIResponse) => {
        const response = (await apiResponse.json()) as ApiErrorResponse;
        const error = response.errors[0];

        expect(error.message).toBe('Unauthorized');
        expect(error.extensions.code).toBe('FORBIDDEN');
      },
      { ...GQL_OPTS, stepTitle: 'get-users' },
    );
  }

  test('global admin user should be allowed to get users', async ({ gqlRunnerByGlobalAdmin }) => {
    allure.description('```' + usersQuery);
    const users = await getUsers(gqlRunnerByGlobalAdmin);

    expect(users.length).toBeGreaterThan(0);
  });

  test('admin user should NOT be allowed to get users', async ({ gqlRunnerByAdmin }) => {
    allure.description('```' + usersQuery);

    await getUsersUnauthorized(gqlRunnerByAdmin);
  });

  test('member user should NOT be allowed to get users', async ({ gqlRunnerByMember }) => {
    allure.description('```' + usersQuery);

    await getUsersUnauthorized(gqlRunnerByMember);
  });
});
