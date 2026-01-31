import { Test, TestingModule } from '@nestjs/testing'
import { AuthGuard } from '../../auth/auth.guard'
import { DonationController } from '../donation.controller'
import { DonationService } from '../donation.service'
import { NotificationRequestDto } from '../dto/notification.dto'
import { RequestDonationDto } from '../dto/request-donation.dto'

describe('DonationController', () => {
  let controller: DonationController
  let donationService: DonationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DonationController],
      providers: [
        {
          provide: DonationService,
          useValue: {
            requestDonation: jest.fn(),
            notifyDonation: jest.fn(),
            getGeneralDonations: jest.fn(),
            getProjectsDonationsByInstitution: jest.fn(),
            getDonationsByInstitution: jest.fn(),
            getDonationsByDonor: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile()

    controller = module.get<DonationController>(DonationController)
    donationService = module.get<DonationService>(DonationService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('requestDonation', () => {
    it('should call donationService.requestDonation with correct data', async () => {
      const requestDonationDto: RequestDonationDto = {
        amount: 10,
        institutionId: 1,
        projectId: 1,
        description: 'test',
      }
      const request = { user: { id: 1 } } as any
      await controller.requestDonation(requestDonationDto, request)
      expect(donationService.requestDonation).toHaveBeenCalledWith(
        requestDonationDto,
        request.user.id,
      )
    })
  })

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
      topic: '',
      resource: '',
    }

    it('should call donationService.notifyDonation', async () => {
      await controller.notifyDonation(requestBody)
      expect(donationService.notifyDonation).toHaveBeenCalled()
    })

    it('should call donationService.notifyDonation with correct data', async () => {
      await controller.notifyDonation(requestBody)
      expect(donationService.notifyDonation).toHaveBeenCalledWith(requestBody)
    })
  })
  describe('findGeneralDonations', () => {
    it('should call donationService.getGeneralDonations with correct parameters', async () => {
      const req = { user: { id: 1 } } as Request & { user: any }
      const page = 2
      const limit = 5
      const period = 'month'

      await controller.findGeneralDonations(page, limit, period, req)
      expect(donationService.getGeneralDonations).toHaveBeenCalledWith(
        req.user,
        page,
        limit,
        period,
      )
    })

    it('should use default values if no query parameters are provided', async () => {
      const req = { user: { id: 1 } } as Request & { user: any }
      await controller.findGeneralDonations(
        undefined,
        undefined,
        undefined,
        req,
      )
      expect(donationService.getGeneralDonations).toHaveBeenCalledWith(
        req.user,
        1,
        10,
        'week',
      )
    })
  })

  describe('findProjectsDonationsByInstitution', () => {
    it('should call donationService.getProjectsDonationsByInstitution with correct parameters', async () => {
      const req = { user: { id: 2 } } as Request & { user: any }
      const page = 3
      const limit = 15
      const period = 'year'

      await controller.findProjectsDonationsByInstitution(
        page,
        limit,
        period,
        req,
      )
      expect(
        donationService.getProjectsDonationsByInstitution,
      ).toHaveBeenCalledWith(req.user, page, limit, period)
    })

    it('should use default values if no query parameters are provided', async () => {
      const req = { user: { id: 2 } } as Request & { user: any }
      await controller.findProjectsDonationsByInstitution(
        undefined,
        undefined,
        undefined,
        req,
      )
      expect(
        donationService.getProjectsDonationsByInstitution,
      ).toHaveBeenCalledWith(req.user, 1, 10, 'week')
    })
  })

  describe('findByInstitution', () => {
    it('should call donationService.getDonationsByInstitution with correct parameters', async () => {
      const req = { user: { id: 3 } } as Request & { user: any }
      const page = 4
      const limit = 20
      const period = '6months'

      await controller.findByInstitution(page, limit, period, req)
      expect(donationService.getDonationsByInstitution).toHaveBeenCalledWith(
        req.user,
        page,
        limit,
        period,
      )
    })

    it('should use default values if no query parameters are provided', async () => {
      const req = { user: { id: 3 } } as Request & { user: any }
      await controller.findByInstitution(undefined, undefined, undefined, req)
      expect(donationService.getDonationsByInstitution).toHaveBeenCalledWith(
        req.user,
        1,
        10,
        'week',
      )
    })
  })

  describe('findByDonor', () => {
    it('should call donationService.getDonationsByDonor with correct parameters', async () => {
      const donorId = 5
      const page = 2
      const limit = 8
      const institutionId = 10
      const projectId = 20
      const period = 'all'
      const req = { user: { id: 4 } } as Request & { user: any }

      await controller.findByDonor(
        req,
        donorId,
        page,
        limit,
        institutionId,
        projectId,
        period,
      )
      expect(donationService.getDonationsByDonor).toHaveBeenCalledWith(
        donorId,
        page,
        limit,
        institutionId,
        projectId,
        req.user,
        period,
      )
    })

    it('should use default values if no query parameters are provided', async () => {
      const donorId = 5
      const req = { user: { id: 4 } } as Request & { user: any }

      // Para institutionId e projectId, se não passados, esperamos que se tornem NaN ao forçar o +
      // Neste caso, o comportamento padrão pode precisar ser ajustado no controller, ou no teste,
      // mas seguiremos o padrão apresentado.
      await controller.findByDonor(
        req,
        donorId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      )
      expect(donationService.getDonationsByDonor).toHaveBeenCalledWith(
        donorId,
        1,
        10,
        null,
        null,
        req.user,
        'week',
      )
    })
  })
})
