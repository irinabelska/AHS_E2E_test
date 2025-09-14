import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import { getDefaultGlobalAdminUser } from '@/tests/playwright/framework/entities/user/TestUser';
import { UpdateUserResponse } from '@/tests/playwright/framework/types/updateUser';

test.describe('updateUser', () => {
  test('should update user data', async ({ gqlRunnerByGlobalAdmin }) => {
    const newPhone = {
      mobile: {
        number: '512222338',
        countryCode: 48,
      },
    };

    const { email, firstName, lastName } = getDefaultGlobalAdminUser();

    const updateUserQuery = `mutation UpdateUser($userInfo: UnboundUserInfo!) {
          updateUser(userInfo: $userInfo) {
            email
            name {
              first
              last
            }
            phone {
              mobile {
                countryCode
                number
              }
            }
          }
        }`;
    const updateUserQueryVariables = {
      userInfo: {
        phone: newPhone,
      },
    };

    allure.description('```' + updateUserQuery + JSON.stringify(updateUserQueryVariables));

    await gqlRunnerByGlobalAdmin.runTestStep(
      { query: updateUserQuery, variables: updateUserQueryVariables },
      async (apiResponse: APIResponse) => {
        const response: UpdateUserResponse = await apiResponse.json();

        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('updateUser');

        const userData = response.data.updateUser;

        expect(userData.email).toBe(email);
        expect(userData.name.first).toBe(firstName);
        expect(userData.name.last).toBe(lastName);
        expect(userData.phone.mobile).toEqual(newPhone.mobile);
      },
    );
  });
});
