import { PrismaClient, PrescriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  const saltRounds = 10;

  // Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password: await bcrypt.hash('admin123', saltRounds),
      name: 'Admin User',
      role: 'admin',
    },
  });

  // Doctor
  const doctorUser = await prisma.user.create({
    data: {
      email: 'dr@test.com',
      password: await bcrypt.hash('dr123', saltRounds),
      name: 'Dr. John Smith',
      role: 'doctor',
    },
  });

  const doctor = await prisma.doctor.create({
    data: {
      userId: doctorUser.id,
      specialty: 'General Medicine',
    },
  });

  await prisma.user.update({
    where: { id: doctorUser.id },
    data: { doctorId: doctor.id },
  });

  // Patient
  const patientUser = await prisma.user.create({
    data: {
      email: 'patient@test.com',
      password: await bcrypt.hash('patient123', saltRounds),
      name: 'Jane Doe',
      role: 'patient',
    },
  });

  const patient = await prisma.patient.create({
    data: {
      userId: patientUser.id,
      birthDate: new Date('1990-05-15'),
    },
  });

  await prisma.user.update({
    where: { id: patientUser.id },
    data: { patientId: patient.id },
  });

  // Prescriptions (10 mixed)
  const medicines = [
    { name: 'Amoxicillin', dosage: '500mg', quantity: 21, instructions: 'Take 3 times a day with food' },
    { name: 'Ibuprofen', dosage: '400mg', quantity: 30, instructions: 'Take every 8 hours as needed' },
    { name: 'Omeprazole', dosage: '20mg', quantity: 14, instructions: 'Take once daily before breakfast' },
    { name: 'Metformin', dosage: '850mg', quantity: 60, instructions: 'Take twice daily with meals' },
    { name: 'Atorvastatin', dosage: '10mg', quantity: 30, instructions: 'Take once daily at bedtime' },
  ];

  const statuses: PrescriptionStatus[] = [
    'pending', 'pending', 'pending', 'pending', 'pending',
    'consumed', 'consumed', 'consumed', 'consumed', 'consumed',
  ];

  for (let i = 0; i < 10; i++) {
    const status = statuses[i];
    const med1 = medicines[i % medicines.length];
    const med2 = medicines[(i + 1) % medicines.length];

    await prisma.prescription.create({
      data: {
        code: `RX-2024-${String(i + 1).padStart(4, '0')}`,
        status,
        notes: `Prescription notes for prescription ${i + 1}`,
        consumedAt: status === 'consumed' ? new Date() : null,
        patientId: patient.id,
        authorId: doctor.id,
        items: {
          create: [
            {
              name: med1.name,
              dosage: med1.dosage,
              quantity: med1.quantity,
              instructions: med1.instructions,
            },
            {
              name: med2.name,
              dosage: med2.dosage,
              quantity: med2.quantity,
              instructions: med2.instructions,
            },
          ],
        },
      },
    });
  }

  console.log('✅ Seed completed!');
  console.log('👤 Admin: admin@test.com / admin123');
  console.log('👨‍⚕️ Doctor: dr@test.com / dr123');
  console.log('🧑 Patient: patient@test.com / patient123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
