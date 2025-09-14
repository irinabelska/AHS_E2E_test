import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';

import { Validator } from './assetsValidator';

test.describe(
  'assetByRoom',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    test.skip(getCurrentEnv() !== Env.PROD, 'This test is configured only to run on production.');

    const knownIssues: KnownIssue[] = [
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-17817',
        expectedException(Error, '.*stale point exceeded.*'),
      ),
    ];

    enum BuildingId {
      CAR_AUTOMATED_LOGIC_FACTORY = 'CAR391-USA-GA-Automated Logic Factory',
      CAR_KENNESAW_OFFICE = 'CAR000-USA-GA-Kennesaw Office',
      CAR_DIGITAL_HUB = 'CAR099-USA-GA-Digital Hub',
      AMAZON_DOPPLER = 'Amazon-SEA40-Doppler',
    }

    interface TestConfig {
      buildingId: BuildingId;
      floorId: string;
      roomId: string;
      roomName: string;
    }

    const CONFIG: TestConfig[] = [
      {
        buildingId: BuildingId.CAR_AUTOMATED_LOGIC_FACTORY,
        floorId: '72c74284-5a75-4e38-a990-6f556a70367e',
        roomId: 'cd009879-4aa6-4192-8768-c189ae8d6247',
        roomName: 'Open Office South (Engg/Development/Testing)',
      },

      {
        buildingId: BuildingId.CAR_DIGITAL_HUB,
        floorId: 'd0935236-5030-4ef7-8075-e0933fb7e0d2',
        roomId: '27014399-cc6d-4082-a601-84bd2779d1f0',
        roomName: 'Open Office - 903',
      },

      {
        buildingId: BuildingId.CAR_KENNESAW_OFFICE,
        floorId: 'd7c72b74-9998-43b5-bcdc-a36be73b7232',
        roomId: 'e3e7710b-e7ee-406c-a9c3-2d247054f577',
        roomName: '201/202/203 Open Office',
      },
      {
        buildingId: BuildingId.AMAZON_DOPPLER,
        floorId: '4a2af170-f335-4b22-a520-8962809f09ee',
        roomId: 'a1c514bf-5a26-47ec-bedb-1ac9bc766030',
        roomName: 'SEA40.01.650 Lobby',
      },
    ];

    type RoomDetails = {
      space: string;
      id: string;
      hasPart: {
        space: Space;
      }[];
    };

    type Space = {
      id: string;
      name: string;
      snapshot: Snapshot;
    };

    type Snapshot = {
      points: Points[];
      history: History;
    };

    type Points = {
      type: string;
      currentValue: CurrentValue;
    };

    type CurrentValue = {
      timestamp: number;
      value: string;
    };

    type History = {
      points: HistoryPoint[];
    };

    type HistoryPoint = {
      type: string;
      value: string;
      timestamp: number;
    };

    const query = `
    query snapshotStandard($nodeId: String!) {
      getNodeById(id: $nodeId) {
        id
        hasPart {
          space {
            id
            name
            snapshot {
              space {
                id
                name
                points(types: []) {
                  type
                  currentValue {
                    timestamp
                    value
                  }
                }
                history(
                  criteria: {
                    fromDateTime: "2024-03-23T05:46:02.389Z"
                    endDateTime: "2024-03-23T15:46:02.389Z"
                  }
                ) {
                  points {
                    type
                    timestamp
                    value
                  }
                }
              }
            }
          }
        }
      }
    }`;

    for (const config of CONFIG) {
      test(`assetByRoom, roomName=${config.roomName}`, async ({ gqlRunnerByGlobalAdmin, withKnownIssues }) => {
        await withKnownIssues(knownIssues).run(async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-17940', 'test case: ABOUND-17940');
          allure.description('```' + query);
          await gqlRunnerByGlobalAdmin.runTestStep(
            {
              query,
              variables: {
                nodeId: config.roomId,
              },
            },
            async (apiResponse: APIResponse) => {
              const response = await apiResponse.json();

              const roomDetails: RoomDetails = response.data.getNodeById;

              for (const part of roomDetails.hasPart) {
                expect(part.space).toBeDefined();
                const space = part.space;

                expect(space.name).toEqual(config.roomName);

                const snapshot = space.snapshot;
                expect(snapshot).toBeDefined();
                expect(snapshot.history).toBeDefined();
                Validator.validateHistoryPoints(snapshot.history.points);
                expect(snapshot.points).toBeDefined();
                Validator.validatePoints(snapshot.points);
              }
            },
          );
        });
      });
    }
  },
);
