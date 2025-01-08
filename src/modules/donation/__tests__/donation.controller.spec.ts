import { Test, TestingModule } from '@nestjs/testing';
import { DonationController } from '../donation.controller';
import { DonationService } from '../donation.service';
import { RequestDonationDto } from '../dto/request-donation.dto';
import { NotificationRequestDto } from '../dto/notification.dto';
import { AuthGuard } from '../../auth/auth.guard';

describe('DonationController', () => {
  let controller: DonationController;
  let donationService: DonationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DonationController],
      providers: [
        {
          provide: DonationService,
          useValue: {
            requestDonation: jest.fn(),
            notifyDonation: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<DonationController>(DonationController);
    donationService = module.get<DonationService>(DonationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('requestDonation', () => {
    it('should call donationService.requestDonation with correct data', async () => {
      const requestDonationDto: RequestDonationDto = {
        amount: 10,
        institutionId: 1,
        projectId: 1,
        description: 'test',
      };
      const request = { user: { id: 1 } } as any;
      await controller.requestDonation(requestDonationDto, request);
      expect(donationService.requestDonation).toHaveBeenCalledWith(
        requestDonationDto,
        request.user.id,
      );
    });
  });

  describe('notifyDonation', () => {
    const requestBody: NotificationRequestDto = {
      id: 123,
      live_mode: true,
      type: 'payment',
      date_created: '2021-08-25T14:00:00Z',
      user_id: 123,
      api_version: 'v1',
      action: 'payment.created',
      data: {
        id: '123',
      },
    };

    it('should call donationService.notifyDonation', async () => {
      await controller.notifyDonation(requestBody);
      expect(donationService.notifyDonation).toHaveBeenCalled();
    });

    it('should call donationService.notifyDonation with correct data', async () => {
      await controller.notifyDonation(requestBody);
      expect(donationService.notifyDonation).toHaveBeenCalledWith(requestBody);
    });
  });
});
