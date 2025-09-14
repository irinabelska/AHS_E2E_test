import { expect } from '@playwright/test';

import { step, test } from '@/tests/playwright/framework/TestConfig';
import { BuildingName } from '@/tests/playwright/framework/entities/Buildings';
import { SubMetersPage } from '@/tests/playwright/framework/pages/buildingview/settings/meters/submeters/SubMetersPage';
import { openBuildingView } from '@/tests/playwright/tests/test.utils';
import { SubMetersTableRow } from '@/tests/playwright/framework/pages/buildingview/settings/meters/submeters/SubMetersTable';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';

test.describe('Settings', () => {
  test.skip(getCurrentEnv() !== Env.DEV || getCurrentEnv() !== Env.LOCAL, 'run only on local/dev');

  test.describe('Sub Meters with Node-Red', () => {
    interface Asset {
      id: string;
      externalId: string;
    }

    test('create an electric submeter', async ({ globalAdminPage, gqlRunnerByGlobalAdmin, request }) => {
      const buildingName = BuildingName.EMERALD_CREST_BUILDING;
      const buildingId = '9148075e-89f2-4615-91ad-e2fb5dea078e';
      const deviceId = crypto.randomUUID();
      const initialValue = Math.round(Math.random() * 100);

      await step('Create a meter via Node-Red', async () => {
        const DBIRTHNodeId = 'c54ce79a950dc2b5';
        const data = {
          input: JSON.stringify({
            value: initialValue,
            deviceId,
          }),
        };
        await request.post(`http://54.166.160.136:1880/node-red-contrib-promptinput/prompt/${DBIRTHNodeId}`, { data });

        await new Promise((r) => {
          setTimeout(r, 10000);
        });
      });

      let createdAsset: Asset;
      await step('Find the unassigned meter', async () => {
        const getBuildingAssetsQuery = {
          query: `query Query($buildingId: String!, $assigned: AssignedValues!) {
                    getAssetsForAllBuildingByAboundId(
                      aboundId: $buildingId
                      assigned: $assigned
                    ) {
                      id
                      externalId
                    }
                  }`,
          variables: { buildingId, assigned: 'unassigned' },
        };
        const getBuildingAssetsRes = await gqlRunnerByGlobalAdmin.runQuery(getBuildingAssetsQuery);
        const {
          data: { getAssetsForAllBuildingByAboundId: assets },
        } = (await getBuildingAssetsRes.json()) as { data: { getAssetsForAllBuildingByAboundId: Asset[] } };
        createdAsset = assets.find((asset: { externalId: string; id: string }) => asset.externalId === deviceId)!;
        expect(createdAsset).not.toBeUndefined();
      });

      let visibleMetersBefore: SubMetersTableRow[];
      await step('Get visible meters before assignment', async () => {
        const subMetersPage: SubMetersPage = await openBuildingView(globalAdminPage, {
          buildingName,
          featureFlags: { aggregateMetersAvailable: true },
        })
          .then((p) => p.buildingViewSideMenu.openSettingsPage())
          .then((p) => p.settingsSideMenu.openSubMetersPage());
        visibleMetersBefore = await subMetersPage.getVisibleMeters();
      });

      await step('Assign the meter to the building', async () => {
        const assignAssetsToSpaceQuery = {
          query: `mutation assignAssetsToSpace($input: AssetSpaceAssignmentRequest!) {
                   assignAssetsToSpace(input: $input) {
                    assets {
                      id
                        hasLocation
                      }
                      space {
                        id
                        isLocationOf
                      }
                    }
                  }`,
          variables: {
            input: {
              assetIds: [createdAsset.id],
              spaceId: buildingId,
            },
          },
        };
        await gqlRunnerByGlobalAdmin.runQuery(assignAssetsToSpaceQuery);
      });

      await step('Check visible meters after assignment', async () => {
        const subMetersPage = await openBuildingView(globalAdminPage, {
          buildingName: BuildingName.EMERALD_CREST_BUILDING,
          featureFlags: { aggregateMetersAvailable: true },
        })
          .then((p) => p.buildingViewSideMenu.openSettingsPage())
          .then((p) => p.settingsSideMenu.openSubMetersPage());
        const visibleMetersAfter = await subMetersPage.getVisibleMeters();
        const createdMeter = visibleMetersAfter.find((meter) => meter.sensorId?.includes(deviceId));

        expect(visibleMetersAfter.length).toBe(visibleMetersBefore.length + 1);
        expect(createdMeter).not.toBeUndefined();
        expect(createdMeter?.consumption).toBe(initialValue);
      });

      await step('Unassign the meter from the building', async () => {
        const unassignAssetsFromSpaceQuery = {
          query: `mutation unassignAssetsFromSpace($input: AssetSpaceUnassignmentRequest!) {
            unassignAssetsFromSpace(input: $input) {
              assets {
                id
                hasLocation
              }
              space {
                id
                isLocationOf
              }
            }
          }
          `,
          variables: {
            input: {
              assetIds: [createdAsset.id],
              spaceId: buildingId,
            },
          },
        };
        await gqlRunnerByGlobalAdmin.runQuery(unassignAssetsFromSpaceQuery);
      });
    });

    test('send consumption value to the electric submeter', async ({ globalAdminPage, request }) => {
      const value = 7222;
      const deviceId = 'electricMeterRuslan25';
      await step('Push a value to the meter via Node-Red', async () => {
        const DDATANodeId = '28b398bcd7e194ac';
        const data = {
          input: JSON.stringify({
            value,
            deviceId,
          }),
        };
        await request.post(`http://54.166.160.136:1880/node-red-contrib-promptinput/prompt/${DDATANodeId}`, { data });

        await new Promise((r) => {
          setTimeout(r, 10000);
        });
      });

      await step('Check the meter on the page', async () => {
        const subMetersPage = await openBuildingView(globalAdminPage, {
          buildingName: BuildingName.EMERALD_CREST_BUILDING,
          featureFlags: { aggregateMetersAvailable: true },
        })
          .then((p) => p.buildingViewSideMenu.openSettingsPage())
          .then((p) => p.settingsSideMenu.openSubMetersPage());
        const visibleMeters = await subMetersPage.getVisibleMeters();
        const createdMeter = visibleMeters.find((meter) => meter.sensorId?.includes(deviceId));

        expect(createdMeter).not.toBeUndefined();
        expect(createdMeter?.consumption).toBe(value);
      });
    });
  });
});
