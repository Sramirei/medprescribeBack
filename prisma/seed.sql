-- ============================================================
--  MedPrescribe — Seed SQL
--  Passwords:
--    admin@test.com   → admin123
--    dr@test.com      → dr123
--    patient@test.com → patient123
--
--  Run with:
--    psql $DATABASE_URL -f seed.sql
-- ============================================================

BEGIN;

-- ─── Clean existing seed data (safe to re-run) ───────────────

DELETE FROM "PrescriptionItem";
DELETE FROM "Prescription";
DELETE FROM "Doctor";
DELETE FROM "Patient";
DELETE FROM "User";

-- ─── Users ───────────────────────────────────────────────────

INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt", "deletedAt", "doctorId", "patientId", "refreshToken")
VALUES
  -- Admin
  ('user_admin_001',
   'admin@test.com',
   '$2b$10$S.ECKywH/tt3VJ8Sr66m/.4MrMamxlGAsnFXHaFBCPI41B1Uppm0G',
   'Admin User',
   'admin',
   NOW(), NOW(), NULL, NULL, NULL, NULL),

  -- Doctor
  ('user_doctor_001',
   'dr@test.com',
   '$2b$10$3B/dAZtaJXe7MY5h8e1RseooVvQeI0OumcqioFFhz9Lys3t0yk5uy',
   'Dr. John Smith',
   'doctor',
   NOW(), NOW(), NULL, NULL, NULL, NULL),

  -- Patient
  ('user_patient_001',
   'patient@test.com',
   '$2b$10$6cEK2HJtggD4w/B7i2nSg.QonJGY2Db3OF7BAg/B.sNYMcco9A6uC',
   'Jane Doe',
   'patient',
   NOW(), NOW(), NULL, NULL, NULL, NULL);

-- ─── Doctor profile ──────────────────────────────────────────

INSERT INTO "Doctor" (id, "userId", specialty)
VALUES ('doctor_001', 'user_doctor_001', 'General Medicine');

-- Link doctor back to user
UPDATE "User" SET "doctorId" = 'doctor_001' WHERE id = 'user_doctor_001';

-- ─── Patient profile ─────────────────────────────────────────

INSERT INTO "Patient" (id, "userId", "birthDate")
VALUES ('patient_001', 'user_patient_001', '1990-05-15 00:00:00');

-- Link patient back to user
UPDATE "User" SET "patientId" = 'patient_001' WHERE id = 'user_patient_001';

-- ─── Prescriptions (5 pending + 5 consumed) ──────────────────

INSERT INTO "Prescription" (id, code, status, notes, "createdAt", "consumedAt", "patientId", "authorId")
VALUES
  ('rx_001', 'RX-2024-0001', 'pending',  'Prescription notes for prescription 1',  NOW() - INTERVAL '10 days', NULL,  'patient_001', 'doctor_001'),
  ('rx_002', 'RX-2024-0002', 'pending',  'Prescription notes for prescription 2',  NOW() - INTERVAL '9 days',  NULL,  'patient_001', 'doctor_001'),
  ('rx_003', 'RX-2024-0003', 'pending',  'Prescription notes for prescription 3',  NOW() - INTERVAL '8 days',  NULL,  'patient_001', 'doctor_001'),
  ('rx_004', 'RX-2024-0004', 'pending',  'Prescription notes for prescription 4',  NOW() - INTERVAL '7 days',  NULL,  'patient_001', 'doctor_001'),
  ('rx_005', 'RX-2024-0005', 'pending',  'Prescription notes for prescription 5',  NOW() - INTERVAL '6 days',  NULL,  'patient_001', 'doctor_001'),
  ('rx_006', 'RX-2024-0006', 'consumed', 'Prescription notes for prescription 6',  NOW() - INTERVAL '5 days',  NOW() - INTERVAL '4 days', 'patient_001', 'doctor_001'),
  ('rx_007', 'RX-2024-0007', 'consumed', 'Prescription notes for prescription 7',  NOW() - INTERVAL '4 days',  NOW() - INTERVAL '3 days', 'patient_001', 'doctor_001'),
  ('rx_008', 'RX-2024-0008', 'consumed', 'Prescription notes for prescription 8',  NOW() - INTERVAL '3 days',  NOW() - INTERVAL '2 days', 'patient_001', 'doctor_001'),
  ('rx_009', 'RX-2024-0009', 'consumed', 'Prescription notes for prescription 9',  NOW() - INTERVAL '2 days',  NOW() - INTERVAL '1 day',  'patient_001', 'doctor_001'),
  ('rx_010', 'RX-2024-0010', 'consumed', 'Prescription notes for prescription 10', NOW() - INTERVAL '1 day',   NOW(),                     'patient_001', 'doctor_001');

-- ─── Prescription Items ───────────────────────────────────────

INSERT INTO "PrescriptionItem" (id, "prescriptionId", name, dosage, quantity, instructions)
VALUES
  -- rx_001: Amoxicillin + Ibuprofen
  ('item_001_1', 'rx_001', 'Amoxicillin',   '500mg', 21, 'Take 3 times a day with food'),
  ('item_001_2', 'rx_001', 'Ibuprofen',     '400mg', 30, 'Take every 8 hours as needed'),

  -- rx_002: Ibuprofen + Omeprazole
  ('item_002_1', 'rx_002', 'Ibuprofen',     '400mg', 30, 'Take every 8 hours as needed'),
  ('item_002_2', 'rx_002', 'Omeprazole',    '20mg',  14, 'Take once daily before breakfast'),

  -- rx_003: Omeprazole + Metformin
  ('item_003_1', 'rx_003', 'Omeprazole',    '20mg',  14, 'Take once daily before breakfast'),
  ('item_003_2', 'rx_003', 'Metformin',     '850mg', 60, 'Take twice daily with meals'),

  -- rx_004: Metformin + Atorvastatin
  ('item_004_1', 'rx_004', 'Metformin',     '850mg', 60, 'Take twice daily with meals'),
  ('item_004_2', 'rx_004', 'Atorvastatin',  '10mg',  30, 'Take once daily at bedtime'),

  -- rx_005: Atorvastatin + Amoxicillin
  ('item_005_1', 'rx_005', 'Atorvastatin',  '10mg',  30, 'Take once daily at bedtime'),
  ('item_005_2', 'rx_005', 'Amoxicillin',   '500mg', 21, 'Take 3 times a day with food'),

  -- rx_006: Amoxicillin + Ibuprofen
  ('item_006_1', 'rx_006', 'Amoxicillin',   '500mg', 21, 'Take 3 times a day with food'),
  ('item_006_2', 'rx_006', 'Ibuprofen',     '400mg', 30, 'Take every 8 hours as needed'),

  -- rx_007: Ibuprofen + Omeprazole
  ('item_007_1', 'rx_007', 'Ibuprofen',     '400mg', 30, 'Take every 8 hours as needed'),
  ('item_007_2', 'rx_007', 'Omeprazole',    '20mg',  14, 'Take once daily before breakfast'),

  -- rx_008: Omeprazole + Metformin
  ('item_008_1', 'rx_008', 'Omeprazole',    '20mg',  14, 'Take once daily before breakfast'),
  ('item_008_2', 'rx_008', 'Metformin',     '850mg', 60, 'Take twice daily with meals'),

  -- rx_009: Metformin + Atorvastatin
  ('item_009_1', 'rx_009', 'Metformin',     '850mg', 60, 'Take twice daily with meals'),
  ('item_009_2', 'rx_009', 'Atorvastatin',  '10mg',  30, 'Take once daily at bedtime'),

  -- rx_010: Atorvastatin + Amoxicillin
  ('item_010_1', 'rx_010', 'Atorvastatin',  '10mg',  30, 'Take once daily at bedtime'),
  ('item_010_2', 'rx_010', 'Amoxicillin',   '500mg', 21, 'Take 3 times a day with food');

COMMIT;

-- ─── Verify ──────────────────────────────────────────────────
SELECT role, email, name FROM "User" ORDER BY role;
