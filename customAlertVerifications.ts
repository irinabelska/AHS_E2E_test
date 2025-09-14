import { expect } from '@playwright/test';

import { AlertCategory, Criticality } from '@/tests/playwright/framework/constants/preferenceUnits';
import { CustomAlert } from '@/tests/playwright/framework/types/alert';

export function verifyCustomAlertRequiredFields(customAlert: CustomAlert) {
  expect(customAlert.enabled).toBeBoolean();
  expect(customAlert.id).toBeTruthy();
  expect(customAlert.name).toBeTruthy();
  expect(customAlert.description).toBeDefined();
  expect(customAlert.category).toBeOneOfEnum(AlertCategory);
  expect(customAlert.createdBy).toBeString();
  expect(customAlert.createdAt).toBeNumber();
  expect(customAlert.updatedBy).toBeString();
  expect(customAlert.updatedAt).toBeNumber();

  if (customAlert.enabled) {
    expect(customAlert.criticality).toBeOneOfEnum(Criticality);
  }
}