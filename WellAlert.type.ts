import { Criticality, MetricType } from '@/tests/playwright/framework/constants/preferenceUnits';
import { getWellAlertCriticalityType, getMetricType } from '@/tests/playwright/framework/utils/enumToType.utils';
import { getCustomerForEnv } from '@/tests/playwright/framework/entities/Customer';
import { CustomerName } from '@/tests/playwright/framework/entities/CustomerName';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';

export type WellAlertSource = {
  id: string;
  criticality: string;
  metricType: string;
  enabled: boolean;
  customerId: string;
};
export interface fetchWellAlertsResponse {
  data: {
    fetchWellAlerts: WellAlertSource[];
  };
}

export class WellAlert {
  constructor(
    readonly id: string,
    readonly criticality: Criticality,
    readonly metricType: MetricType,
    readonly enabled: boolean,
    readonly customerId: string,
  ) {}

  static create(source: WellAlertSource): WellAlert {
    return new WellAlert(
      source.id,
      getWellAlertCriticalityType(source.criticality),
      getMetricType(source.metricType),
      source.enabled,
      source.customerId,
    );
  }
}

const customerId =
  getCurrentEnv() === Env.PROD
    ? getCustomerForEnv(CustomerName.AUTOMATED_LOGIC).id
    : getCustomerForEnv(CustomerName.ALC).id;

export const expectedWellAlerts: WellAlert[] = [
  new WellAlert(
    `${customerId}-${MetricType.Temperature}-${Criticality.Priority_1}-well`,
    Criticality.Priority_1,
    MetricType.Temperature,
    true,
    customerId,
  ),
  new WellAlert(
    `${customerId}-${MetricType.Temperature}-${Criticality.Priority_2}-well`,
    Criticality.Priority_2,
    MetricType.Temperature,
    true,
    customerId,
  ),
  new WellAlert(
    `${customerId}-${MetricType.Humidity}-${Criticality.Priority_1}-well`,
    Criticality.Priority_1,
    MetricType.Humidity,
    true,
    customerId,
  ),
  new WellAlert(
    `${customerId}-${MetricType.Humidity}-${Criticality.Priority_2}-well`,
    Criticality.Priority_2,
    MetricType.Humidity,
    true,
    customerId,
  ),
  new WellAlert(
    `${customerId}-${MetricType.Co2}-${Criticality.Priority_1}-well`,
    Criticality.Priority_1,
    MetricType.Co2,
    true,
    customerId,
  ),
  new WellAlert(
    `${customerId}-${MetricType.Co2}-${Criticality.Priority_2}-well`,
    Criticality.Priority_2,
    MetricType.Co2,
    true,
    customerId,
  ),
  new WellAlert(
    `${customerId}-${MetricType.TvoCs}-${Criticality.Priority_1}-well`,
    Criticality.Priority_1,
    MetricType.TvoCs,
    true,
    customerId,
  ),
  new WellAlert(
    `${customerId}-${MetricType.TvoCs}-${Criticality.Priority_2}-well`,
    Criticality.Priority_2,
    MetricType.TvoCs,
    true,
    customerId,
  ),
  new WellAlert(
    `${customerId}-${MetricType.Pm25}-${Criticality.Priority_1}-well`,
    Criticality.Priority_1,
    MetricType.Pm25,
    true,
    customerId,
  ),
  new WellAlert(
    `${customerId}-${MetricType.Pm25}-${Criticality.Priority_2}-well`,
    Criticality.Priority_2,
    MetricType.Pm25,
    true,
    customerId,
  ),
  new WellAlert(
    `${customerId}-${MetricType.Radon}-${Criticality.Priority_1}-well`,
    Criticality.Priority_1,
    MetricType.Radon,
    true,
    customerId,
  ),
  new WellAlert(
    `${customerId}-${MetricType.Radon}-${Criticality.Priority_2}-well`,
    Criticality.Priority_2,
    MetricType.Radon,
    true,
    customerId,
  ),
];