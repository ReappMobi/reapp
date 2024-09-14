import { Test, TestingModule } from '@nestjs/testing';
import { DonationController } from '../donation.controller';
import { DonationService } from '../donation.service';
import { RequestDonationDto } from '../dto/request-donation.dto';

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
            callbackDonation: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DonationController>(DonationController);
    donationService = module.get<DonationService>(DonationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('requestDonation', () => {
    it('should call donationService.requestDonation with correct data', async () => {
      const requestDonationDto: RequestDonationDto = {
        userToken: 'test',
        amount: 10,
        institutionId: 1,
        projectId: 1,
        description: 'test',
      };
      await controller.requestDonation(requestDonationDto);
      expect(donationService.requestDonation).toHaveBeenCalledWith(
        requestDonationDto,
      );
    });
  });

  describe('callbackDonation', () => {
    it('should call donationService.callbackDonation', async () => {
      await controller.callbackDonation();
      expect(donationService.notifyDonation).toHaveBeenCalled();
    });
  });
});
