import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Prescriptions (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/prescriptions', () => {
    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prescriptions')
        .expect(401);
    });
  });

  describe('POST /api/v1/prescriptions', () => {
    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/prescriptions')
        .send({ patientId: 'some-id', items: [{ name: 'Aspirin' }] })
        .expect(401);
    });
  });
});
