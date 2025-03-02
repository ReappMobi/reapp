import * as request from 'supertest';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';

import { AccountService } from '../src/modules/account/account.service';
import { PrismaService } from '../src/database/prisma.service';
import { AccountModule } from '../src/modules/account/account.module';
import { AccountType } from '@prisma/client';

describe('DonorController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AccountModule],
      providers: [AccountService, PrismaService],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  describe('[POST] /account', () => {
    const createDonorAccountData = {
      email: 'test_donor@reapp.com',
      password: 'test1234',
      name: 'Reapp Donor',
      accountType: AccountType.DONOR,
    };

    it('should create a new donor account', async () => {
      const response = await request(app.getHttpServer())
        .post('/account')
        .send(createDonorAccountData);
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 1,
        email: createDonorAccountData.email,
        name: createDonorAccountData.name,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        donor: {
          donations: [],
        },
        institution: null,
      });
    });
  });
});
