import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionPdfService } from './pdf/prescription-pdf.service';

@Module({
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PrescriptionPdfService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
