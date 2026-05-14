import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
  doctorId?: string | null;
  patientId?: string | null;
}
