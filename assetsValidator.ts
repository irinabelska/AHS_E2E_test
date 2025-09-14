import { expect } from '@playwright/test';

import { METRIC_NAMES, METRIC_TIMEOUTS, MetricName, MetricNamesEnum } from '@/framework/constants/preferenceUnits';

interface Points {
  type: string;
  currentValue: {
    timestamp: number;
  };
}

interface HistoryPoint {
  type: string;
  timestamp: number;
}

export class Validator {
  static validatePoints(data: Points[]) {
    const now = new Date();

    data
      .filter((point) => point.type !== 'Zone Air PM10 Sensor')
      .forEach((point) => {
        const { type, currentValue } = point;
        const timeDifference = (now.getTime() - currentValue.timestamp) / (1000 * 60);

        const expectedMetricTimeout = Validator.getTimeoutInMinutesForTheMetric(type);
        expect(
          timeDifference,
          `stale point exceeded ${expectedMetricTimeout} min, timeDifference=${timeDifference}, point=${JSON.stringify(
            point,
          )}`,
        ).toBeLessThanOrEqual(expectedMetricTimeout);
      });
  }

  static validateHistoryPoints(points: HistoryPoint[]) {
    const pointsGroupedByType = new Map<string, HistoryPoint[]>();

    points.forEach((point) => {
      const pointsList = pointsGroupedByType.get(point.type) ?? [];
      pointsList.push(point);
      pointsGroupedByType.set(point.type, pointsList);
    });

    pointsGroupedByType.forEach((points, type) => {
      points.forEach((currentPoint, index, allPoints) => {
        if (index !== 0) {
          const previousPoint = allPoints[index - 1];
          const timeDifferenceBetweenPointsInMinutes = (currentPoint.timestamp - previousPoint.timestamp) / (1000 * 60);
          const expectedMetricTimeout = Validator.getTimeoutInMinutesForTheMetric(type);

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

  static isMetricName(metricName: string): metricName is MetricName {
    return METRIC_NAMES.includes(metricName as MetricNamesEnum);
  }

  static getTimeoutInMinutesForTheMetric(metricName: string): number {
    if (Validator.isMetricName(metricName)) {
      return METRIC_TIMEOUTS[metricName];
    }

    return 15;
  }
}