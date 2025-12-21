import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function fixSettledBalanceErrors() {
  console.log('==========================================');
  console.log('修复 settledAccountBalance 错误数据');
  console.log('==========================================\n');

  try {
    // 1. 检查错误数据
    console.log('步骤 1: 检查错误数据...\n');

    const errorStats = await prisma.$queryRaw<
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

    const { errorCount, totalDiff } = errorStats[0];
    console.log(`发现错误交易: ${errorCount} 笔`);
    console.log(`总差额: ${totalDiff || 0}\n`);

    if (Number(errorCount) === 0) {
      console.log('✅ 没有发现错误数据，无需修复！');
      return;
    }

    // 2. 显示样本数据
    const sampleErrors = await prisma.$queryRaw<
      Array<{
        orderNumber: string;
        userName: string | null;
        entryAccountBalance: number;
        settledAccountBalance: number;
        actualReturn: number;
        diff: number;
      }>
    >`
      SELECT
        "orderNumber",
        "userName",
        ROUND("entryAccountBalance"::numeric, 2) AS "entryAccountBalance",
        ROUND("settledAccountBalance"::numeric, 2) AS "settledAccountBalance",
        ROUND("actualReturn"::numeric, 2) AS "actualReturn",
        ROUND((("settledAccountBalance" - "entryAccountBalance") - "actualReturn")::numeric, 2) AS "diff"
      FROM "TransactionLog"
      WHERE "settledAccountBalance" IS NOT NULL
        AND "entryAccountBalance" IS NOT NULL
        AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
      ORDER BY "createdAt" DESC
      LIMIT 3
    `;

    console.log('样本错误数据:');
    console.table(sampleErrors);

    // 3. 询问是否继续
    const answer = await askQuestion('\n是否继续修复？(y/n): ');
    if (answer.toLowerCase() !== 'y') {
      console.log('取消修复');
      return;
    }

    // 4. 备份错误数据
    console.log('\n步骤 2: 备份错误数据...');

    await prisma.$executeRaw`
      DROP TABLE IF EXISTS "TransactionLog_Backup_SettledBalance"
    `;

    await prisma.$executeRaw`
      CREATE TABLE "TransactionLog_Backup_SettledBalance" AS
      SELECT * FROM "TransactionLog"
      WHERE "settledAccountBalance" IS NOT NULL
        AND "entryAccountBalance" IS NOT NULL
        AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
    `;

    const backupCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "TransactionLog_Backup_SettledBalance"
    `;

    console.log(`已备份 ${backupCount[0].count} 条记录\n`);

    // 5. 修复错误数据
    console.log('步骤 3: 修复错误数据...');

    const result = await prisma.$executeRaw`
      UPDATE "TransactionLog"
      SET "settledAccountBalance" = "entryAccountBalance" + "actualReturn"
      WHERE "settledAccountBalance" IS NOT NULL
        AND "entryAccountBalance" IS NOT NULL
        AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
    `;

    console.log(`已修复 ${result} 条记录\n`);

    // 6. 验证修复结果
    console.log('步骤 4: 验证修复结果...');

    const remainingErrors = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT COUNT(*) as count
      FROM "TransactionLog"
      WHERE "settledAccountBalance" IS NOT NULL
        AND "entryAccountBalance" IS NOT NULL
        AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
    `;

    const remaining = Number(remainingErrors[0].count);

    if (remaining === 0) {
      console.log('✅ 所有错误数据已修复！\n');
    } else {
      console.log(`⚠️  仍有 ${remaining} 条错误数据\n`);
    }

    // 7. 显示修复后的样本数据
    const fixedSamples = await prisma.$queryRaw<
      Array<{
        orderNumber: string;
        userName: string | null;
        entryAccountBalance: number;
        settledAccountBalance: number;
        actualReturn: number;
        balanceChange: number;
        status: string;
      }>
    >`
      SELECT
        "orderNumber",
        "userName",
        ROUND("entryAccountBalance"::numeric, 2) AS "entryAccountBalance",
        ROUND("settledAccountBalance"::numeric, 2) AS "settledAccountBalance",
        ROUND("actualReturn"::numeric, 2) AS "actualReturn",
        ROUND(("settledAccountBalance" - "entryAccountBalance")::numeric, 2) AS "balanceChange",
        CASE
          WHEN ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") < 0.01
          THEN '✅ 正确'
          ELSE '❌ 错误'
        END AS "status"
      FROM "TransactionLog"
      WHERE "settledAccountBalance" IS NOT NULL
        AND "entryAccountBalance" IS NOT NULL
      ORDER BY "createdAt" DESC
      LIMIT 5
    `;

    console.log('修复后的样本数据:');
    console.table(fixedSamples);

    console.log('\n==========================================');
    console.log('修复完成！');
    console.log('==========================================\n');

    console.log('提示:');
    console.log('1. 备份数据已保存到 TransactionLog_Backup_SettledBalance 表');
    console.log('2. 如果需要回滚，请手动恢复备份数据');
    console.log('3. 确认无误后可删除备份表');
  } catch (error) {
    console.error('修复失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixSettledBalanceErrors().catch((error) => {
  console.error('执行失败:', error);
  process.exit(1);
});
