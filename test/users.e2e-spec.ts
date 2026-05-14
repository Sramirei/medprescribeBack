import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Users CRUD (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

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

  describe('Authentication required', () => {
    it('GET /users → 401 without token', () => {
      return request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('POST /users → 401 without token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/users')
        .send({ name: 'Test', email: 'x@x.com', password: '123456', role: 'doctor' })
        .expect(401);
    });
  });

  describe('Validation', () => {
    it('POST /auth/login → 400 for invalid body', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-email', password: '' })
        .expect(400)
        .expect((res) => {
          expect(res.body.code).toBe('BAD_REQUEST');
          expect(res.body.details).toBeDefined();
        });
    });
  });
});
