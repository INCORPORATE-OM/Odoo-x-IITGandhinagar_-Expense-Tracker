const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create sample company
  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Acme Corporation',
      country: 'United States',
      currency: 'USD'
    }
  });

  console.log('✅ Company created:', company.name);

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      email: 'admin@acme.com',
      password: adminPassword,
      fullName: 'Admin User',
      role: 'ADMIN',
      companyId: company.id
    }
  });

  console.log('✅ Admin user created:', admin.email);

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 12);
  const manager = await prisma.user.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      email: 'manager@acme.com',
      password: managerPassword,
      fullName: 'Manager User',
      role: 'MANAGER',
      companyId: company.id
    }
  });

  console.log('✅ Manager user created:', manager.email);

  // Create employee users
  const employeePassword = await bcrypt.hash('employee123', 12);
  const employee1 = await prisma.user.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      email: 'employee1@acme.com',
      password: employeePassword,
      fullName: 'Employee One',
      role: 'EMPLOYEE',
      companyId: company.id,
      reportsTo: manager.id
    }
  });

  const employee2 = await prisma.user.upsert({
    where: { id: 4 },
    update: {},
    create: {
      id: 4,
      email: 'employee2@acme.com',
      password: employeePassword,
      fullName: 'Employee Two',
      role: 'EMPLOYEE',
      companyId: company.id,
      reportsTo: manager.id
    }
  });

  console.log('✅ Employee users created:', employee1.email, employee2.email);

  // Create approval sequence
  await prisma.approvalSequence.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyId: company.id,
      sequence: JSON.stringify([
        { type: 'manager', value: null },
        { type: 'role', value: 'MANAGER' }
      ]),
      isActive: true
    }
  });

  console.log('✅ Approval sequence created');

  // Create sample expenses
  const expenses = [
    {
      userId: employee1.id,
      companyId: company.id,
      originalAmount: 25.50,
      originalCurrency: 'USD',
      companyAmount: 25.50,
      companyCurrency: 'USD',
      category: 'Meals',
      description: 'Lunch meeting with client',
      date: new Date('2024-01-15'),
      status: 'PENDING'
    },
    {
      userId: employee2.id,
      companyId: company.id,
      originalAmount: 45.00,
      originalCurrency: 'USD',
      companyAmount: 45.00,
      companyCurrency: 'USD',
      category: 'Transportation',
      description: 'Taxi fare to client office',
      date: new Date('2024-01-14'),
      status: 'APPROVED'
    },
    {
      userId: employee1.id,
      companyId: company.id,
      originalAmount: 120.00,
      originalCurrency: 'USD',
      companyAmount: 120.00,
      companyCurrency: 'USD',
      category: 'Office Supplies',
      description: 'Printer paper and stationery',
      date: new Date('2024-01-10'),
      status: 'REJECTED'
    }
  ];

  for (const expenseData of expenses) {
    const expense = await prisma.expense.create({
      data: expenseData
    });
    console.log(`✅ Sample expense created: $${expense.originalAmount} - ${expense.category}`);
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📝 Sample login credentials:');
  console.log('Admin: admin@acme.com / admin123');
  console.log('Manager: manager@acme.com / manager123');
  console.log('Employee: employee1@acme.com / employee123');
  console.log('Employee: employee2@acme.com / employee123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
