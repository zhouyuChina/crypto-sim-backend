const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  const newPassword = 'admin123';
  const passwordHash = await bcrypt.hash(newPassword, 12);

  const admin = await prisma.admin.update({
    where: { username: 'admin' },
    data: { passwordHash },
    select: {
      id: true,
      username: true,
      email: true,
    }
  });

  console.log('✅ 管理员密码已重置');
  console.log('用户名:', admin.username);
  console.log('邮箱:', admin.email);
  console.log('新密码:', newPassword);

  await prisma.$disconnect();
}

resetAdminPassword().catch((e) => {
  console.error('❌ 错误:', e);
  process.exit(1);
});
