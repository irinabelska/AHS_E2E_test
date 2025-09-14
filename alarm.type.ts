import { AlertCenterDeviceType, MetricNamesEnum } from '@/framework/constants/preferenceUnits';

export interface AboundAlarm {
  id: string;
  label?: AlertCenterDeviceStatus;
  aboundId: string;
  buildingId: string;
  acknowledgment?: boolean;
  acknowledgedByUserId?: string | null;
}

export enum AlertCenterDeviceStatus {
  ALL = 'ALL',
  NEW = 'NEW',
  RESOLVED = 'RESOLVED',
}

export const allowedMetricsForDeviceType: { [key in AlertCenterDeviceType]: string[] } = {
  [AlertCenterDeviceType.All]: [
    MetricNamesEnum.TEMPERATURE,
    MetricNamesEnum.HUMIDITY,
    MetricNamesEnum.CO2,
    MetricNamesEnum.TVOC,
    MetricNamesEnum.RADON,
    MetricNamesEnum.PM25,
    MetricNamesEnum.OCCUPANCY,
    MetricNamesEnum.WELL,
    MetricNamesEnum.IAQ_SCORE,
  ],
  [AlertCenterDeviceType.Iaq]: [
    MetricNamesEnum.TEMPERATURE,
    MetricNamesEnum.HUMIDITY,
    MetricNamesEnum.CO2,
    MetricNamesEnum.TVOC,
    MetricNamesEnum.RADON,
    MetricNamesEnum.PM25,
  ],
};