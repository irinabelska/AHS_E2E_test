import { BuildingName, getBuildingForQaEnv } from '@/tests/playwright/framework/entities/Buildings';
import { test } from '@/tests/playwright/framework/TestConfig';
import { UtilityMetersActions } from '@/tests/playwright/framework/apiActions/UtilityMetersActions';

test.describe('cleanup utility meters', () => {
  test.skip(true, 'skipped on purpose so that no-one runs it by mistake');

  const searchString = 'e2e-';
  const buildingName = getBuildingForQaEnv(BuildingName.CIB).id;

  test('delete all utility meters created by e2e tests', async () => {
    const mmIds = await UtilityMetersActions.getMmIdsBySearchString(searchString, buildingName);
    await test.info().attach(`lis of meters to be deleted: ${mmIds}`);

    for (const mmId of mmIds) {
      await UtilityMetersActions.removeMeterByMmId(mmId);
    }
  });
});
