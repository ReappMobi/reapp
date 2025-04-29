import {
  Body,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Post } from '@nestjs/common'
import { RequestDonationDto } from './dto/request-donation.dto'
import { DonationService } from './donation.service'
import { NotificationRequestDto } from './dto/notification.dto'
import { AuthGuard } from '../auth/auth.guard'
import { Role } from '../auth/enums/role.enum'
import { Roles } from '../auth/docorators/roles.decorator'

interface RequestWithUser extends Request {
  user?: { id: number }
}

@Controller('donation')
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post('request')
  @UseGuards(AuthGuard)
  requestDonation(
    @Body() requestDonationDto: RequestDonationDto,
    @Req() req: RequestWithUser,
  ) {
    const accountId = req.user.id
    return this.donationService.requestDonation(
      requestDonationDto,
      Number(accountId),
    )
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Get('all')
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 30) {
    return this.donationService.getAllDonations(page, limit)
  }

  @UseGuards(AuthGuard)
  @Get('institution/general')
  async findGeneralDonations(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('period') period: string = 'week',
    @Req() req: RequestWithUser,
  ) {
    return this.donationService.getGeneralDonations(
      req.user,
      page,
      limit,
      period as 'week' | 'month' | '6months' | 'year' | 'all',
    )
  }

  @UseGuards(AuthGuard)
  @Get('institution/projects')
  findProjectsDonationsByInstitution(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('period') period: string = 'week',
    @Req() req: RequestWithUser,
  ) {
    return this.donationService.getProjectsDonationsByInstitution(
      req.user,
      page,
      limit,
      period as 'week' | 'month' | '6months' | 'year' | 'all',
    )
  }

  @UseGuards(AuthGuard)
  @Get('institution')
  findByInstitution(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('period') period: string = 'week',
    @Req() req: RequestWithUser,
  ) {
    return this.donationService.getDonationsByInstitution(
      req.user,
      page,
      limit,
      period as 'week' | 'month' | '6months' | 'year' | 'all',
    )
  }

  @UseGuards(AuthGuard)
  @Get('institution/:institutionId')
  findByInstitutionId(
    @Param('institutionId') institutionId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() req: RequestWithUser,
  ) {
    const { user } = req
    return this.donationService.getDonationsByInstitutionId(
      +institutionId,
      +page,
      +limit,
      user,
    )
  }

  @UseGuards(AuthGuard)
  @Get('project/:projectId')
  findByProject(
    @Param('projectId') projectId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() req: RequestWithUser,
  ) {
    return this.donationService.getDonationsByInstitutionId(
      projectId,
      page,
      limit,
      req.user,
    )
  }

  @UseGuards(AuthGuard)
  @Get('donor/:donorId')
  findByDonor(
    @Req() req: RequestWithUser,
    @Param('donorId') donorId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('institutionId') institutionId?: number,
    @Query('projectId') projectId?: number,
    @Query('period') period: string = 'week',
  ) {
    const user = req.user
    const parsedInstitutionId = institutionId ? +institutionId : null
    const parsedProjectId = projectId ? +projectId : null

    return this.donationService.getDonationsByDonor(
      +donorId,
      +page,
      +limit,
      parsedInstitutionId,
      parsedProjectId,
      user,
      period as 'week' | 'month' | '6months' | 'year' | 'all',
    )
  }

  @Post('notify')
  notifyDonation(@Body() requestBody: NotificationRequestDto) {
    return this.donationService.notifyDonation(requestBody)
  }
}
