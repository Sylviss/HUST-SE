// ./backend/prisma/seed.js
import { PrismaClient, StaffRole } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Use the same hashing library

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const existingManager = await prisma.staff.findFirst({
    where: { role: StaffRole.MANAGER },
  });

  if (!existingManager) {
    const saltRounds = 10; // Same as in your passwordUtils
    const adminPassword = 'admin123'; // Change this!
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const adminUser = await prisma.staff.create({
      data: {
        name: 'Default Admin',
        username: 'admin', // Or your preferred admin username
        passwordHash: hashedPassword,
        role: StaffRole.MANAGER,
        isActive: true,
      },
    });
    console.log(`Created admin user: ${adminUser.username}`);
  } else {
    console.log('Manager account already exists. Skipping seed.');
  }

  console.log(`Seeding finished.`);
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });