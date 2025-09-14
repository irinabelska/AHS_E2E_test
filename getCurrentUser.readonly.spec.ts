import { APIResponse, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

import { test } from '@/tests/playwright/framework/TestConfig';
import {
  AreaPreferenceUnit,
  DistancePreferenceUnit,
  EnergyPreferenceUnit,
  GasPreferenceUnit,
  SteamPreferenceUnit,
  TemperaturePreferenceUnit,
  WaterPreferenceUnit,
} from '@/tests/playwright/framework/constants/preferenceUnits';

const query = `
  query GetCurrentUser {
    getCurrentUser {
      id
      email
      name {
        first
        last
      }
      role
      phone {
        mobile {
          countryCode
          number
        }
      }
      acceptedPrivacyPolicyDate
      userPreferences {
        defaultSiteId
        defaultCustomerId
        currencyCode
        unitPreferences {
          temperatureUnit
          distanceUnit
          areaUnit
          energyUnit
          waterUnit
          gasUnit
          steamUnit
        }
        favoriteSites
      }
      brickClasses {
        customers {
          name
          id
        }
      }
      alarmWatchlist
      hasIAQDevices
    }
  }
`;

type CurrentUser = {
  id: string;
  email: string;
  name: {
    first: string;
    last: string;
  };
  role: string;
  phone: {
    mobile: {
      countryCode: number;
      number: string;
    };
  };
  acceptedPrivacyPolicyDate: string;
  userPreferences: {
    defaultSiteId: string;
    defaultCustomerId: string;
    currencyCode: string;
    unitPreferences: {
      temperatureUnit: string;
      distanceUnit: string;
      areaUnit: string;
      energyUnit: string;
      waterUnit: string;
      gasUnit: string;
      steamUnit: string;
    };
    favoriteSites: string[];
  };
  brickClasses: {
    customers: {
      name: string;
      id: string;
    }[];
  };
  alarmWatchlist: string[];
  hasIAQDevices: boolean;
};

test(
  'getCurrentUser',
  {
    tag: ['@regression', '@api'],
  },
  async ({ gqlRunnerByGlobalAdmin }) => {
    allure.link('https://carrier-digital.atlassian.net/browse/ABOUND-16753', 'Test case: ABOUND-16753');
    allure.description('```' + query);

    await gqlRunnerByGlobalAdmin.runTestStep({ query, variables: {} }, async (apiResponse: APIResponse) => {
      const response = await apiResponse.json();

      const currentUser: CurrentUser = response.data.getCurrentUser;

      expect(currentUser).toBeDefined();
      expect(currentUser.id).toBeDefined();
      expect(currentUser.email).toBeDefined();
      expect(currentUser.name.first).toBeDefined();
      expect(currentUser.name.last).toBeDefined();
      expect(currentUser.role).toBeDefined();
      expect(currentUser.phone.mobile.countryCode).toBeDefined();
      expect(currentUser.phone.mobile.number).toBeDefined();
      expect(currentUser.acceptedPrivacyPolicyDate).toBeDefined();

      expect(currentUser.userPreferences.defaultSiteId).toBeDefined();
      expect(currentUser.userPreferences.defaultCustomerId).toBeDefined();
      expect(currentUser.userPreferences.currencyCode).toBeDefined();
      expect(currentUser.userPreferences.unitPreferences.temperatureUnit).toBeOneOfEnum(TemperaturePreferenceUnit);
      expect(currentUser.userPreferences.unitPreferences.distanceUnit).toBeOneOfEnum(DistancePreferenceUnit);
      expect(currentUser.userPreferences.unitPreferences.areaUnit).toBeOneOfEnum(AreaPreferenceUnit);
      expect(currentUser.userPreferences.unitPreferences.energyUnit).toBeOneOfEnum(EnergyPreferenceUnit);
      expect(currentUser.userPreferences.unitPreferences.waterUnit).toBeOneOfEnum(WaterPreferenceUnit);
      expect(currentUser.userPreferences.unitPreferences.gasUnit).toBeOneOfEnum(GasPreferenceUnit);
      expect(currentUser.userPreferences.unitPreferences.steamUnit).toBeOneOfEnum(SteamPreferenceUnit);
      expect(currentUser.userPreferences.favoriteSites).toBeDefined();

      currentUser.brickClasses.customers.forEach((customer) => {
        expect(customer.name).toBeDefined();
        expect(customer.id).toBeDefined();
      });
      expect(currentUser.alarmWatchlist).toBeInstanceOf(Array);
      expect(currentUser.hasIAQDevices).toBe(true);
    });
  },
);