import { test } from '@playwright/test';

import { TemperaturePreferenceUnit } from '@/framework/constants/preferenceUnits';
import { FeatureFlags } from '@/tests/playwright/framework/launchdarkly/FeatureFlagProvider';
import { AuthTokenRepository } from '@/tests/playwright/framework/authorization/AuthTokenRepository';
import { logger, step } from '@/tests/playwright/framework/TestConfig';
import { BuildingName } from '@/tests/playwright/framework/entities/Buildings';
import { GqlGatewayProxy } from '@/tests/playwright/framework/api/GqlGatewayProxy';
import { getCurrentEnv, getGqlGatewayUrl } from '@/tests/playwright/framework/Env';
import { AuthorizedPage } from '@/tests/playwright/framework/pages/AuthorizedPage';
import { getDefaultGlobalAdminUser, TestUser } from '@/tests/playwright/framework/entities/user/TestUser';
import { PortfolioViewPage } from '@/tests/playwright/framework/pages/AboundApplicationPage';

export interface BuildingViewOpts {
  buildingName?: BuildingName;
  featureFlags?: FeatureFlags;
}

export async function openBuildingView(page: AuthorizedPage, opts?: BuildingViewOpts) {
  if (opts?.featureFlags) {
    const checkResult = page.user.featuresEnabled(opts.featureFlags);
    test.skip(!checkResult.pass, `Feature flag check failed: ${checkResult.message}`);
  }
  const buildingViewPage = await page.goToBuildingViewPage();

  if (opts?.buildingName) {
    await buildingViewPage.openBuildingView(opts.buildingName);
  }

  return buildingViewPage;
}

export async function openPortfolioView(page: AuthorizedPage, featureFlags?: FeatureFlags): Promise<PortfolioViewPage> {
  return step(`open Portfolio view for ${page.user.email}`, async () => {
    return openBuildingView(page, { featureFlags }).then((_) => _.topBar.openPortfolioOverview());
  });
}

const getNodeByBrickClassQuery = `  query ($brickClass: String!) {
    getNodeByBrickClass(brickClass: $brickClass) {
      id
      name
      brickClass
      isOwnedBy
      isPartOf {
          space {
              id
              brickClass
              isPartOf {
                  space {
                      brickClass
                  }
              }
          }
      }
    }
  }`;

function encode(textToEncode: string) {
  return Buffer.from(textToEncode, 'binary').toString('base64');
}

export interface NodeByBrickClassResponse {
  getNodeByBrickClass: { id: string; name: string; brickClass: string }[];
}

export async function getCustomerBuildings(id: string) {
  const encodedText = encode(`{"customerId": "${id}"}`);
  const gqlGateway = new GqlGatewayProxy(await AuthTokenRepository.getToken(getDefaultGlobalAdminUser()));
  const response = await gqlGateway.runQueryExpectSuccess<NodeByBrickClassResponse>(
    {
      query: getNodeByBrickClassQuery,
      variables: { brickClass: 'Building' },
      httpHeaders: { 'customer-context': encodedText },
    },
    getGqlGatewayUrl(getCurrentEnv()),
  );

  const buildings = response.data.getNodeByBrickClass as [];

  logger.info(`Customer ${id} has ${buildings.join(', ')} buildings`);

  return buildings;
}

export async function removeConsumptionTargetFromBuilding(buildingId: string, year: number) {
  const gqlGateway = new GqlGatewayProxy(await AuthTokenRepository.getToken(getDefaultGlobalAdminUser()));
  const deleteConsumptionTargetMutation = `
    mutation RemoveConsumptionEnergyTarget($payload: EnergyConsumptionPayload!) {
      removeConsumptionEnergyTarget(payload: $payload) {
        success
        code
      }
    }`;

  const variables = {
    payload: {
      buildingId,
      year,
      source: 'SUBMETER',
    },
  };

  await gqlGateway.runQueryExpectSuccess(
    { query: deleteConsumptionTargetMutation, variables: variables },
    getGqlGatewayUrl(getCurrentEnv()),
  );
}

export async function removeSpendTargetFromBuilding(buildingId: string, year: number) {
  const gqlGateway = new GqlGatewayProxy(await AuthTokenRepository.getToken(getDefaultGlobalAdminUser()));

  const deleteSpendTargetMutation = `
      mutation RemoveSpendEnergyTarget($payload: EnergySpendPayload!) {
      removeSpendEnergyTarget(payload: $payload) {
        success
        code
      }
    }`;

  const variables = {
    payload: {
      buildingId,
      year,
      source: 'SUBMETER',
    },
  };

  await gqlGateway.runQueryExpectSuccess(
    { query: deleteSpendTargetMutation, variables: variables },
    getGqlGatewayUrl(getCurrentEnv()),
  );
}
