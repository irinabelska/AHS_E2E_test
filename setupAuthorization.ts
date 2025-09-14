import { expect, test as setup } from '@playwright/test';

import {
  getDefaultAdminUser,
  getDefaultGlobalAdminUser,
  getDefaultMemberUser,
  getSecondGlobalAdminUser,
} from '@/tests/playwright/framework/entities/user/TestUser';
import { AuthStorageRepository } from '@/tests/playwright/framework/authorization/AuthStorageRepository';

setup.describe('Setup: Authorize users', () => {
  setup('authenticate as default global admin', async ({ page }) => {
    const globalAdminUser = getDefaultGlobalAdminUser();

    await AuthStorageRepository.addStorage(globalAdminUser, page);
    expect(await AuthStorageRepository.getStorageFile(globalAdminUser)).toBeTruthy();
  });

  setup('authenticate as default member', async ({ page }) => {
    const memberUser = getDefaultMemberUser();

    await AuthStorageRepository.addStorage(memberUser, page);
    expect(await AuthStorageRepository.getStorageFile(memberUser)).toBeTruthy();
  });

  setup('authenticate as default admin', async ({ page }) => {
    const defaultAdmin = getDefaultAdminUser();

    await AuthStorageRepository.addStorage(defaultAdmin, page);
    expect(await AuthStorageRepository.getStorageFile(defaultAdmin)).toBeTruthy();
  });

  setup('authenticate as second global admin', async ({ page }) => {
    const secondGlobalAdminUser = getSecondGlobalAdminUser();

    await AuthStorageRepository.addStorage(secondGlobalAdminUser, page);
    expect(await AuthStorageRepository.getStorageFile(secondGlobalAdminUser)).toBeTruthy();
  });
});
