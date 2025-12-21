import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSettledBalanceErrors() {
  console.log('==========================================');
  console.log('检查 settledAccountBalance 错误数据');
  console.log('==========================================\n');

  try {
    // 1. 统计错误数据总数
    console.log('==========================================');
    console.log('1. 错误数据统计');
    console.log('==========================================');

    const errorTransactions = await prisma.$queryRaw<
      Array<{ errorCount: bigint; totalDiff: number }>
    >`
      SELECT
        COUNT(*) AS "errorCount",
        ROUND(SUM(ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn"))::numeric, 2) AS "totalDiff"
      FROM "TransactionLog"
      WHERE "settledAccountBalance" IS NOT NULL
        AND "entryAccountBalance" IS NOT NULL
        AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
    `;

    const { errorCount, totalDiff } = errorTransactions[0];
    console.log(`错误交易总数: ${errorCount}`);
    console.log(`总差额: ${totalDiff || 0}\n`);

    if (Number(errorCount) === 0) {
      console.log('✅ 没有发现错误数据！');
      return;
    }

    // 2. 查看错误数据详情
    console.log('==========================================');
    console.log('2. 错误数据详情（前 10 条）');
    console.log('==========================================');

    const errorDetails = await prisma.$queryRaw<
      Array<{
        orderNumber: string;
        userName: string | null;
        investAmount: number;
        actualReturn: number;
        entryAccountBalance: number;
        settledAccountBalance: number;
        diff: number;
        accountType: string;
      }>
    >`
      SELECT
        "orderNumber",
        "userName",
        ROUND("investAmount"::numeric, 2) AS "investAmount",
        ROUND("actualReturn"::numeric, 2) AS "actualReturn",
        ROUND("entryAccountBalance"::numeric, 2) AS "entryAccountBalance",
        ROUND("settledAccountBalance"::numeric, 2) AS "settledAccountBalance",
        ROUND((("settledAccountBalance" - "entryAccountBalance") - "actualReturn")::numeric, 2) AS "diff",
        "accountType"
      FROM "TransactionLog"
      WHERE "settledAccountBalance" IS NOT NULL
        AND "entryAccountBalance" IS NOT NULL
        AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
      ORDER BY "createdAt" DESC
      LIMIT 10
    `;

    console.table(errorDetails);

    // 3. 按账户类型统计
    console.log('\n==========================================');
    console.log('3. 按账户类型统计');
    console.log('==========================================');

    const byAccountType = await prisma.$queryRaw<
      Array<{
        accountType: string;
        errorCount: bigint;
        totalDiff: number;
      }>
    >`
      SELECT
        "accountType",
        COUNT(*) AS "errorCount",
        ROUND(SUM(ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn"))::numeric, 2) AS "totalDiff"
      FROM "TransactionLog"
      WHERE "settledAccountBalance" IS NOT NULL
        AND "entryAccountBalance" IS NOT NULL
        AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
      GROUP BY "accountType"
    `;

    console.table(byAccountType);

    // 4. 按用户统计
    console.log('\n==========================================');
    console.log('4. 受影响用户（前 5 名）');
    console.log('==========================================');

    const byUser = await prisma.$queryRaw<
      Array<{
        userName: string | null;
        errorCount: bigint;
        totalDiff: number;
      }>
    >`
      SELECT
        "userName",
        COUNT(*) AS "errorCount",
        ROUND(SUM(ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn"))::numeric, 2) AS "totalDiff"
      FROM "TransactionLog"
      WHERE "settledAccountBalance" IS NOT NULL
        AND "entryAccountBalance" IS NOT NULL
        AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
      GROUP BY "userName"
      ORDER BY COUNT(*) DESC
      LIMIT 5
    `;

    console.table(byUser);

    // 5. 检查 NULL 值
    console.log('\n==========================================');
    console.log('5. NULL 值检查');
    console.log('==========================================');

    const nullCheck = await prisma.$queryRaw<
      Array<{
        totalCount: bigint;
        missingEntryBalance: bigint;
        missingSettledBalance: bigint;
      }>
    >`
      SELECT
        COUNT(*) AS "totalCount",
        COUNT(CASE WHEN "entryAccountBalance" IS NULL THEN 1 END) AS "missingEntryBalance",
        COUNT(CASE WHEN "settledAccountBalance" IS NULL AND status = 'SETTLED' THEN 1 END) AS "missingSettledBalance"
      FROM "TransactionLog"
    `;

    const { totalCount, missingEntryBalance, missingSettledBalance } =
      nullCheck[0];
    console.log(`总交易数: ${totalCount}`);
    console.log(`缺少开仓余额: ${missingEntryBalance}`);
    console.log(`已结算但无结算余额: ${missingSettledBalance}\n`);

    console.log('==========================================');
    console.log('检查完成！');
    console.log('==========================================\n');

    if (Number(errorCount) > 0) {
      console.log('⚠️  发现错误数据！');
      console.log('如需修复，请执行: npm run fix-settled-balance');
    }
  } catch (error) {
    console.error('检查失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkSettledBalanceErrors().catch((error) => {
  console.error('执行失败:', error);
  process.exit(1);
});
