import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { BuildingDesc, BuildingSortingProperty, Order } from '@/framework/constants/preferenceUnits';
import { test } from '@/tests/playwright/framework/TestConfig';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { KnownIssue } from '@/tests/playwright/framework/knownissues/KnownIssue';
import { expectedException } from '@/tests/playwright/framework/knownissues/ExpectedException';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';

const query = `query ($options: SortingParameters) {
    fetchBuildingDesc(options: $options) {
      buildings {
        buildingId
        siteId

        basicBuildingDesc {
          name
          imageUrl
        }

        alerting {
          activeCount
          criticalCount
          cautionCount
        }

        buildingSpaceDesc {
          sqft
          occupiableCapacityPpl
          location {
            street
            city
            country
            zip
            state
          }
        }

        buildingPrimaryUsage {
          useTypeId
          spaceUsageType
        }

        iaqWellness {
          wellScore
          wellScoreChange24h
        }

        iaqPerformance {
          co2 {
            unit
            value
          }
          humidity {
            unit
            value
          }
          pm25 {
            unit
            value
          }
          radon {
            unit
            value
          }
          temperature {
            unit
            value
          }
          vocs {
            unit
            value
          }
        }
      }
      totalCount
    }
  }
`;

type OrderedComparator<T> = (order: Order, a: T | null | undefined, b: T | null | undefined) => number;

class BuildingComparatorFactory<T> {
  constructor(
    private orderedComparator: OrderedComparator<T>,
    private propertyRetriever: (b: BuildingDesc) => T | null | undefined,
  ) {}

  create(order: Order): (b1: BuildingDesc, b2: BuildingDesc) => number {
    return (b1: BuildingDesc, b2: BuildingDesc) =>
      this.orderedComparator(order, this.propertyRetriever(b1), this.propertyRetriever(b2));
  }
}

const compareStrings = (order: Order, s1: string | null | undefined, s2: string | null | undefined): number => {
  if (!s1) {
    return 1;
  }

  if (!s2) {
    return -1;
  }

  return order === Order.ASC ? s1.localeCompare(s2) : s2.localeCompare(s1);
};

const compareNumbers = (order: Order, n1: number | null | undefined, n2: number | null | undefined): number => {
  if (n1 === undefined || n1 === null) {
    return 1;
  }

  if (n2 === undefined || n2 === null) {
    return -1;
  }

  return order === Order.ASC ? n1 - n2 : n2 - n1;
};

const locationAsStringForSorting = (b: BuildingDesc): string | null => {
  const address = [
    b.buildingSpaceDesc?.location?.country,
    b.buildingSpaceDesc?.location?.state,
    b.buildingSpaceDesc?.location?.city,
    b.buildingSpaceDesc?.location?.zip,
    b.buildingSpaceDesc?.location?.street,
  ].filter((it) => Boolean(it));

  return address.length === 0 ? null : address.join(' ');
};

/* eslint-disable  @typescript-eslint/no-explicit-any */
const buildingComparators: Map<BuildingSortingProperty, BuildingComparatorFactory<any>> = new Map<
  BuildingSortingProperty,
  BuildingComparatorFactory<any>
>([
  [
    BuildingSortingProperty.AlertingActiveCount,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.alerting?.activeCount),
  ],
  [
    BuildingSortingProperty.AlertingCautionCount,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.alerting?.cautionCount),
  ],
  [
    BuildingSortingProperty.AlertingCriticalCount,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.alerting?.criticalCount),
  ],
  [
    BuildingSortingProperty.BuildingArea,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.buildingSpaceDesc?.sqft),
  ],
  [
    BuildingSortingProperty.BuildingLocation,
    new BuildingComparatorFactory(compareStrings, (b: BuildingDesc) => locationAsStringForSorting(b)),
  ],
  [
    BuildingSortingProperty.BuildingName,
    new BuildingComparatorFactory(compareStrings, (b: BuildingDesc) => b.basicBuildingDesc?.name),
  ],
  [
    BuildingSortingProperty.BuildingOccupation,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.buildingSpaceDesc?.occupiableCapacityPpl),
  ],
  [
    BuildingSortingProperty.BuildingPrimaryUsage,
    new BuildingComparatorFactory(compareStrings, (b: BuildingDesc) => b.buildingPrimaryUsage?.spaceUsageType),
  ],
  [
    BuildingSortingProperty.IaqCo2,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.iaqPerformance?.co2?.value),
  ],
  [
    BuildingSortingProperty.IaqHumidity,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.iaqPerformance?.humidity?.value),
  ],
  [
    BuildingSortingProperty.IaqPm25,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.iaqPerformance?.pm25?.value),
  ],
  [
    BuildingSortingProperty.IaqRadon,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.iaqPerformance?.radon?.value),
  ],
  [
    BuildingSortingProperty.IaqScoreChange,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.iaqWellness?.wellScoreChange24h),
  ],
  [
    BuildingSortingProperty.IaqTemperature,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.iaqPerformance?.temperature?.value),
  ],
  [
    BuildingSortingProperty.IaqVocs,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.iaqPerformance?.vocs?.value),
  ],
  [
    BuildingSortingProperty.IaqWellScore,
    new BuildingComparatorFactory(compareNumbers, (b: BuildingDesc) => b.iaqWellness?.wellScore),
  ],
]);
/* eslint-enable  @typescript-eslint/no-explicit-any */

const limit = 5;
const variablesTemplate = {
  limit,
  offset: 0,
};

const sortingProperties = Object.values(BuildingSortingProperty);
const supportedOrders = Object.values(Order);

test.describe(
  'fetchBuildingDesc',
  {
    tag: ['@regression', '@api'],
  },
  () => {
    // it is needed to properly define allure suite
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    test('test comparators', ({ allureSuite }) => {
      expect([1, null, 2, 7, null, 3].sort((b1, b2) => compareNumbers(Order.ASC, b1, b2))).toEqual([
        1,
        2,
        3,
        7,
        null,
        null,
      ]);
      expect([1, null, 2, 7, null, 3].sort((b1, b2) => compareNumbers(Order.DESC, b1, b2))).toEqual([
        7,
        3,
        2,
        1,
        null,
        null,
      ]);
      expect(['a', null, 'b', 'h', null, 'c'].sort((b1, b2) => compareStrings(Order.ASC, b1, b2))).toEqual([
        'a',
        'b',
        'c',
        'h',
        null,
        null,
      ]);
      expect(['a', null, 'b', 'h', null, 'c'].sort((b1, b2) => compareStrings(Order.DESC, b1, b2))).toEqual([
        'h',
        'c',
        'b',
        'a',
        null,
        null,
      ]);
    });

    const knownIssues: KnownIssue[] = [
      new KnownIssue(
        'https://carrier-digital.atlassian.net/browse/ABOUND-17929',
        expectedException(Error, '.*invalid order for buildingLocation.*'),
      ),
    ];

    for (const sortingProperty of sortingProperties) {
      for (const order of supportedOrders) {
        test(`order by ${JSON.stringify(sortingProperty)} (${JSON.stringify(order)}) works as expected`, async ({
          gqlRunnerByGlobalAdmin,
          withKnownIssues,
        }) => {
          await withKnownIssues(knownIssues).run(async () => {
            allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-12474', 'ABOUND-12474');
            const variables = {
              options: {
                ...variablesTemplate,
                orderDirection: order,
                orderBy: sortingProperty,
              },
            };

            const comparatorFactory = buildingComparators.get(sortingProperty);

            if (!comparatorFactory) {
              throw Error(`missing comparator, sortingProperty=${JSON.stringify(order)}`);
            }

            allure.description('```' + query);
            const customer =
              getCurrentEnv() === Env.PROD
                ? getCustomerForEnv(CustomerName.AUTOMATED_LOGIC)
                : getCustomerForEnv(CustomerName.ALC);
            await gqlRunnerByGlobalAdmin.runTestStep(
              {
                query,
                variables,
                customerContext: { customerId: customer.id },
              },
              async (apiResponse: APIResponse) => {
                const response = await apiResponse.json();
                expect(response.data.fetchBuildingDesc.buildings).toBeDefined();

                const buildings = response.data.fetchBuildingDesc.buildings as BuildingDesc[];
                const sortedBuildings = [...buildings].sort(comparatorFactory.create(order));

                expect(buildings.length).toBeLessThanOrEqual(limit);
                expect(
                  buildings,
                  `invalid order for ${JSON.stringify(sortingProperty)} (${JSON.stringify(order)})`,
                ).toEqual(sortedBuildings);
              },
            );
          });
        });
      }
    }
  },
);