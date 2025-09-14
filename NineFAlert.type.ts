import { Criticality, MetricType } from '@/tests/playwright/framework/constants/preferenceUnits';
import { getMetricType, getNineFAlertCriticalityType } from '@/tests/playwright/framework/utils/enumToType.utils';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { Env, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { Customer } from '@/tests/playwright/framework/entities/Customer';

export type NineFAlertSource = { criticality: string; metricType: string; enabled: boolean; customerId: string };
export interface getStandard9FAlertsResponse {
  data: {
    standard9FAlerts: NineFAlertSource[];
  };
}
export class NineFAlert {
  constructor(
    readonly criticality: Criticality,
    readonly metricType: MetricType,
    readonly enabled: boolean,
    readonly customerId: string,
  ) {}

  static create(source: NineFAlertSource): NineFAlert {
    return new NineFAlert(
      getNineFAlertCriticalityType(source.criticality),
      getMetricType(source.metricType),
      source.enabled,
      source.customerId,
    );
  }
}

const customers = new Map<Env, Customer>([
  [Env.DEV, Customer.DEV_CARRIER_CIB],
  [Env.LOCAL, Customer.DEV_CARRIER_CIB],
  [Env.QA, Customer.QA_CARRIER],
  [Env.PRE_PROD, Customer.PREPROD_LINK_LOGISTICS],
  [Env.PROD, Customer.PROD_CARRIER_CORP],
]);

const customer = forceGetFromMap(customers, getCurrentEnv());
const customerId = customer.id;

export const expectedNineFAlerts: NineFAlert[] = [
  new NineFAlert(Criticality.Priority_1, MetricType.Temperature, true, customerId),
  new NineFAlert(Criticality.Priority_2, MetricType.Temperature, true, customerId),
  new NineFAlert(Criticality.Priority_3, MetricType.Temperature, true, customerId),
  new NineFAlert(Criticality.Priority_1, MetricType.Humidity, true, customerId),
  new NineFAlert(Criticality.Priority_2, MetricType.Humidity, true, customerId),
  new NineFAlert(Criticality.Priority_3, MetricType.Humidity, true, customerId),
  new NineFAlert(Criticality.Priority_1, MetricType.Co2, true, customerId),
  new NineFAlert(Criticality.Priority_2, MetricType.Co2, true, customerId),
  new NineFAlert(Criticality.Priority_3, MetricType.Co2, true, customerId),
  new NineFAlert(Criticality.Priority_1, MetricType.Pm25, true, customerId),
  new NineFAlert(Criticality.Priority_2, MetricType.Pm25, true, customerId),
  new NineFAlert(Criticality.Priority_3, MetricType.Pm25, true, customerId),
  new NineFAlert(Criticality.Priority_1, MetricType.TvoCs, true, customerId),
  new NineFAlert(Criticality.Priority_2, MetricType.TvoCs, true, customerId),
  new NineFAlert(Criticality.Priority_3, MetricType.TvoCs, true, customerId),
  new NineFAlert(Criticality.Priority_1, MetricType.Radon, true, customerId),
  new NineFAlert(Criticality.Priority_2, MetricType.Radon, true, customerId),
  new NineFAlert(Criticality.Priority_3, MetricType.Radon, true, customerId),
];