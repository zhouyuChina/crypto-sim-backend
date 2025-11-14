import {
  CycleStatus,
  MarketSessionStatus,
  Prisma,
  SubMarketStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface TradeTypeRule {
  assetType: string;
  durations: number[];
}

export interface ResolveCycleParams {
  duration: number;
  assetType?: string;
}

export function parseTradeTypes(
  value: Prisma.JsonValue | null | undefined,
): TradeTypeRule[] {
  if (!value || !Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        item &&
        typeof item === 'object' &&
        'assetType' in item &&
        'durations' in item
      ) {
        const assetType = String((item as any).assetType || '').toUpperCase();
        const durations = Array.isArray((item as any).durations)
          ? (item as any).durations
              .map((d: any) => Number(d))
              .filter((d: number) => Number.isFinite(d) && d > 0)
          : [];

        if (assetType && durations.length > 0) {
          return {
            assetType,
            durations,
          };
        }
      }
      return null;
    })
    .filter((item): item is TradeTypeRule => item !== null);
}

export function isTradeAllowed(
  tradeTypes: Prisma.JsonValue | null | undefined,
  assetType: string | undefined,
  duration: number,
): boolean {
  const rules = parseTradeTypes(tradeTypes);

  if (rules.length === 0) {
    return true;
  }

  const normalizedAsset = (assetType || '').replace('/', '').toUpperCase();

  return rules.some(
    (rule) =>
      rule.assetType.replace('/', '').toUpperCase() === normalizedAsset &&
      rule.durations.includes(duration),
  );
}

export async function resolveActiveSubMarketCycle(
  prisma: PrismaService,
  params: ResolveCycleParams,
) {
  const { duration, assetType } = params;

  const cycle = await prisma.subMarketCycle.findFirst({
    where: {
      status: CycleStatus.RUNNING,
      subMarket: {
        tradeDuration: duration,
        status: SubMarketStatus.ACTIVE,
        marketSession: {
          status: MarketSessionStatus.ACTIVE,
          ...(assetType
            ? {
                assetType,
              }
            : {}),
        },
      },
    },
    orderBy: { startTime: 'desc' },
    include: {
      subMarket: {
        include: {
          marketSession: {
            select: {
              id: true,
              tradeTypes: true,
            },
          },
        },
      },
    },
  });

  if (!cycle) {
    return null;
  }

  if (!isTradeAllowed(cycle.subMarket.marketSession.tradeTypes, assetType, duration)) {
    return null;
  }

  return cycle;
}

export async function adjustSubMarketCycleStats(
  prisma: PrismaService,
  cycleId: string | null | undefined,
  deltaCount: number,
  deltaAmount: number,
) {
  if (!cycleId || deltaCount === 0 && deltaAmount === 0) {
    return;
  }

  await prisma.subMarketCycle.update({
    where: { id: cycleId },
    data: {
      orderCount: {
        increment: deltaCount,
      },
      totalAmount: {
        increment: new Prisma.Decimal(deltaAmount),
      },
    },
  });
}
