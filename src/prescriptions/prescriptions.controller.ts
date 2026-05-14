import {
  Controller, Get, Post, Put, Param, Body,
  UseGuards, Query, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionPdfService } from './pdf/prescription-pdf.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { QueryPrescriptionDto } from './dto/query-prescription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('prescriptions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
    private readonly pdfService: PrescriptionPdfService,
  ) {}

  @Post()
  @Roles('doctor')
  @ApiOperation({ summary: 'Create prescription (doctor only)' })
  @ApiResponse({ status: 201, description: 'Prescription created' })
  create(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.create(dto, user);
  }

  @Get()
  @Roles('admin', 'doctor', 'patient')
  @ApiOperation({ summary: 'List prescriptions (filtered by role)' })
  findAll(@Query() query: QueryPrescriptionDto, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.findAll(query, user);
  }

  @Get(':id')
  @Roles('admin', 'doctor', 'patient')
  @ApiOperation({ summary: 'Get prescription by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.findOne(id, user);
  }

  @Put(':id/consume')
  @Roles('patient', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark prescription as consumed (patient/admin)' })
  consume(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.prescriptionsService.consume(id, user);
  }

  @Get(':id/pdf')
  @Roles('admin', 'doctor', 'patient')
  @ApiOperation({ summary: 'Download prescription as PDF' })
  @ApiResponse({ status: 200, description: 'Returns PDF file', content: { 'application/pdf': {} } })
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const prescription = await this.prescriptionsService.findOne(id, user);
    await this.pdfService.generatePdf(prescription as Parameters<typeof this.pdfService.generatePdf>[0], res);
  }
}
