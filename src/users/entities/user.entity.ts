import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Exclude, Expose, Type } from 'class-transformer';

export class DoctorEntity {
  @Expose() id: string;
  @Expose() specialty: string | null;
}

export class PatientEntity {
  @Expose() id: string;
  @Expose() birthDate: Date | null;
}

export class UserEntity {
  @ApiProperty() @Expose() id: string;
  @ApiProperty() @Expose() email: string;
  @ApiProperty() @Expose() name: string;
  @ApiProperty({ enum: Role }) @Expose() role: Role;
  @ApiProperty() @Expose() createdAt: Date;
  @ApiProperty() @Expose() updatedAt: Date;
  @ApiPropertyOptional() @Expose() deletedAt: Date | null;
  @ApiPropertyOptional() @Expose() doctorId: string | null;
  @ApiPropertyOptional() @Expose() patientId: string | null;

  @ApiPropertyOptional({ type: () => DoctorEntity })
  @Expose()
  @Type(() => DoctorEntity)
  doctor?: DoctorEntity | null;

  @ApiPropertyOptional({ type: () => PatientEntity })
  @Expose()
  @Type(() => PatientEntity)
  patient?: PatientEntity | null;

  // Never exposed in responses
  @Exclude() password: string;
  @Exclude() refreshToken: string | null;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
