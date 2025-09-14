import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { METRIC_NAMES, METRIC_TIMEOUTS, MetricName, MetricNamesEnum } from '@/framework/constants/preferenceUnits';
import { test } from '@/tests/playwright/framework/TestConfig';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { AssetDetailsResponse, HistoryPoint, Points } from '@/tests/playwright/framework/types/assetDetails';

test.describe(
  'assetDetails',
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

    interface TestConfig {
      deviceId: string;
      deviceName: string;
      buildingIntegrationName: string;
    }

    const CONFIG: TestConfig[] = [
      {
        deviceId: 'f5de9abc-380c-4bd7-88f8-2b6480f8bb6c',
        deviceName: '32ea3af1-a562-4628-ab09-3c78fe0b582a',
        buildingIntegrationName: 'Kaiterra-CAR000-USA-GA-Kennesaw Office',
      },
      {
        deviceId: '69d6c45a-495a-4830-bf86-4fc5f721026f',
        deviceName: 'RTU 1 ARC',
        buildingIntegrationName: 'ALC-CAR391-USA-GA-Automated Logic Factory',
      },
      {
        deviceId: '431ca730-4286-467f-9167-01ac7053419e',
        deviceName: 'Carrier_ATL_Digital_HUB_3350_-_Floor_9',
        buildingIntegrationName: 'Butlr-CAR099-USA-GA-Digital Hub',
      },
      {
        deviceId: '74fc362e-42c9-4896-9a9e-77b9e8072b8d',
        deviceName: 'CAR-ASHRAE',
        buildingIntegrationName: 'Butlr-ASHRAE Global HQ',
      },
      {
        deviceId: 'df4a1d01-ec8a-4a50-a56c-e984f0b3b09b',
        deviceName: 'College_of_Business',
        buildingIntegrationName: 'Butlr-College_of_Business',
      },
      {
        deviceId: '01e9d9df-cfac-402e-9b38-24f0fe86658e',
        deviceName: 'Carrier-Blackstone-Flr_1',
        buildingIntegrationName: 'Butlr-Carrier-Blackstone',
      },
      {
        deviceId: '8fb45321-49ae-4509-b60c-ccbe71bb2e5e',
        deviceName: 'Carrier-Blackstone-Flr_3',
        buildingIntegrationName: 'Butlr-Carrier-Blackstone',
      },
      {
        deviceId: 'c8cd3472-e3dd-4b9f-8206-923f0bc42366',
        deviceName: 'KC20510000',
        buildingIntegrationName: 'Kaiterra-Amazon-SZX24-Corp Office',
      },
      {
        deviceId: '8998497c-7f52-4e85-9073-eefded8d812c',
        deviceName: '2969001576',
        buildingIntegrationName: 'Airthings-Amazon-SEA40-Doppler',
      },
      {
        deviceId: '6bbde8d5-2abf-4e59-ac9d-bc16ca7fb71d',
        deviceName: 'E3T21050844',
        buildingIntegrationName: 'Cortex-New-Archibalt-Leasing-Office',
      },
      {
        deviceId: 'af33ed21-3b39-4ad0-8a8c-06e3509d487c',
        deviceName: 'E3T21051038',
        buildingIntegrationName: 'Cortex-Lake-Forest',
      },
      {
        deviceId: '0a769d84-c5db-4b14-8b11-7f254fffc452',
        deviceName: 'E3T22042176',
        buildingIntegrationName: 'Cortex-Lake-Forest',
      },
      {
        deviceId: '850cd934-9275-4d4f-8039-64d7d136d9d7',
        deviceName: 'E3T21113959',
        buildingIntegrationName: 'Cortex-Dallas-Business-Park',
      },
      {
        deviceId: '581b43e5-baba-4b0c-a40c-a21b638d34a8',
        deviceName: 'E3T21114124',
        buildingIntegrationName: 'Cortex-Dallas-Business-Park',
      },
      {
        deviceId: '0795976a-a6d8-4123-b7a8-8a84c1118e58',
        deviceName: 'E3T22042120',
        buildingIntegrationName: 'Cortex-Santa-Clara-Commerce',
      },
    ];

    const query = `

  query assetDetails($assetNodeId: String!, $fromDateTime: String!, $toDateTime: String!) {
    getNodeById(id: $assetNodeId) {
      id
      name
      externalId
      mapXPos
      mapYPos
      hasLocation {
        space {
          id
          name
          brickClass
        }
      }
      snapshot {
        asset {
          type
          description
          properties {
            key
            value
          }
          status
          points(types: []) {
            type
            description
            externalId
            currentValue {
              timestamp
              value
            }
          }
          history(criteria: { fromDateTime: $fromDateTime, endDateTime: $toDateTime }) {
            points {
              type
              value
              timestamp
            }
          }
        }
      }
    }
  }`;

    function getVariables(assetNodeId: string) {
      return {
        assetNodeId,
        fromDateTime: '2024-02-29T19:32:36.488Z',
        toDateTime: '2024-03-01T19:32:36.488Z',
      };
    }

    function validatePoints(data: Points[]) {
      const now = new Date();

      data
        .filter((point) => point.type !== 'Zone Air PM10 Sensor')
        .forEach((point) => {
          const { type, currentValue } = point;
          const timeDifference = (now.getTime() - currentValue.timestamp) / (1000 * 60);

          const expectedMetricTimeout = getTimeoutInMinutesForTheMetric(type);
          expect(
            timeDifference,
            `stale point exceeded ${expectedMetricTimeout} min, timeDifference=${timeDifference}, point=${JSON.stringify(
              point,
            )}`,
          ).toBeLessThanOrEqual(expectedMetricTimeout);
        });
    }

    function validateHistoryPoints(points: HistoryPoint[]) {
      const pointsGroupedByType: Map<string, HistoryPoint[]> = points.reduce((acc, point) => {
        const points: HistoryPoint[] = acc.get(point.type) ?? [];
        points.push(point);
        acc.set(point.type, points);

        return acc;
      }, new Map<string, HistoryPoint[]>());

      pointsGroupedByType.forEach((points, type) => {
        points.forEach((currentPoint, index, allPoints) => {
          if (index !== 0) {
            const previousPoint = allPoints[index - 1];
            const timeDifferenceBetweenPointsInMinutes =
              (currentPoint.timestamp - previousPoint.timestamp) / (1000 * 60);
            const expectedMetricTimeout = getTimeoutInMinutesForTheMetric(type);

            expect(
              timeDifferenceBetweenPointsInMinutes,
              `timeout exceeded ${expectedMetricTimeout} min for currentPoint${JSON.stringify(
                currentPoint,
              )}, previousPoint=${JSON.stringify(previousPoint)}`,
            ).toBeLessThanOrEqual(expectedMetricTimeout);
          }
        });
      });
    }

    function isMetricName(metricName: string): metricName is MetricName {
      return METRIC_NAMES.includes(metricName as MetricNamesEnum);
    }

    function getTimeoutInMinutesForTheMetric(metricName: string): number {
      if (isMetricName(metricName)) {
        return METRIC_TIMEOUTS[metricName];
      }

      return 15;
    }

    for (const config of CONFIG) {
      test(`assetDetails, devicename=${config.deviceName}`, async ({ gqlRunnerByGlobalAdmin, withKnownIssues }) => {
        await withKnownIssues(knownIssues).run(async () => {
          allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16631', 'test case: ABOUND-16631');
          allure.description('```' + query);
          await gqlRunnerByGlobalAdmin.runTestStep(
            { query, variables: getVariables(config.deviceId) },
            async (apiResponse: APIResponse) => {
              const response: AssetDetailsResponse = await apiResponse.json();

              const assetDetails = response.data.getNodeById;
              expect(assetDetails.name).toEqual(config.deviceName);

              validateHistoryPoints(assetDetails.snapshot.asset.history.points);
              validatePoints(assetDetails.snapshot.asset.points);
            },
          );
        });
      });
    }
  },
);