import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Ndiipano API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let practitionerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/api/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('Authentication', () => {
    const patientDto = {
      email: 'e2e.patient@test.com',
      phone: '+260971111111',
      password: 'TestPass123!',
      firstName: 'E2E',
      lastName: 'Patient',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      consentDataProcessing: true,
      consentTerms: true,
    };

    const practitionerDto = {
      email: 'e2e.doctor@test.com',
      phone: '+260972222222',
      password: 'TestPass123!',
      firstName: 'E2E',
      lastName: 'Doctor',
      dateOfBirth: '1985-01-01',
      gender: 'MALE',
      consentDataProcessing: true,
      consentTerms: true,
      practitionerType: 'DOCTOR',
      hpczRegistrationNumber: 'HPCZ-E2E-0001',
      serviceRadiusKm: 25,
      baseConsultationFee: 300,
    };

    it('POST /api/auth/register/patient - should register a patient', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send(patientDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.refreshToken).toBeDefined();
          expect(res.body.data.user.email).toBe(patientDto.email);
          expect(res.body.data.user.role).toBe('PATIENT');
          accessToken = res.body.data.accessToken;
        });
    });

    it('POST /api/auth/register/practitioner - should register a practitioner', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register/practitioner')
        .send(practitionerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.user.role).toBe('PRACTITIONER');
          practitionerToken = res.body.data.accessToken;
        });
    });

    it('POST /api/auth/register/patient - should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register/patient')
        .send(patientDto)
        .expect(409);
    });

    it('POST /api/auth/login - should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: patientDto.email, password: patientDto.password })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.accessToken).toBeDefined();
          accessToken = res.body.data.accessToken;
        });
    });

    it('POST /api/auth/login - should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: patientDto.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('GET /api/auth/me - should return current user', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.email).toBe(patientDto.email);
        });
    });

    it('GET /api/auth/me - should reject without token', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  describe('Users', () => {
    it('GET /api/users/profile - should return user profile', () => {
      return request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.firstName).toBe('E2E');
        });
    });

    it('PATCH /api/users/profile - should update profile', () => {
      return request(app.getHttpServer())
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Updated' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.firstName).toBe('Updated');
        });
    });
  });

  describe('Practitioners', () => {
    it('GET /api/practitioners/search - should search practitioners', () => {
      return request(app.getHttpServer())
        .get('/api/practitioners/search')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/practitioners/search?practitionerType=DOCTOR - should filter by type', () => {
      return request(app.getHttpServer())
        .get('/api/practitioners/search?practitionerType=DOCTOR')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('Search', () => {
    it('GET /api/search/service-types - should return service types', () => {
      return request(app.getHttpServer())
        .get('/api/search/service-types')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });
});
