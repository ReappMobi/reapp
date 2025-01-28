import {
  Body,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Post } from '@nestjs/common';
import { RequestDonationDto } from './dto/request-donation.dto';
import { DonationService } from './donation.service';
import { NotificationRequestDto } from './dto/notification.dto';
import { AuthGuard } from '../auth/auth.guard';

interface RequestWithUser extends Request {
  user?: { id: number };
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
    const accountId = req.user.id;
    return this.donationService.requestDonation(
      requestDonationDto,
      Number(accountId),
    );
  }

  @UseGuards(AuthGuard)
  @Get('all')
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.donationService.getAllDonations(page, limit);
  }

  @UseGuards(AuthGuard)
  @Get('institution')
  findByInstitution(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() req: RequestWithUser,
  ) {
    return this.donationService.getDonationsByInstitution(
      req.user,
      page,
      limit,
    );
  }

  @UseGuards(AuthGuard)
  @Get('institution/:institutionId')
  findByInstitutionId(
    @Param('institutionId') institutionId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() req: RequestWithUser,
  ) {
    const { user } = req;
    return this.donationService.getDonationsByInstitutionId(
      +institutionId,
      +page,
      +limit,
      user,
    );
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
    );
  }

  @UseGuards(AuthGuard)
  @Get('donor/:donorId')
  findByDonor(
    @Param('donorId') donorId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('institutionId') institutionId: number = null,
    @Query('projectId') projectId: number = null,
    @Req() req: RequestWithUser,
  ) {
    const user = req.user;

    return this.donationService.getDonationsByDonor(
      +donorId,
      +page,
      +limit,
      +institutionId,
      +projectId,
      user,
    );
  }

  @Post('notify')
  notifyDonation(@Body() requestBody: NotificationRequestDto) {
    return this.donationService.notifyDonation(requestBody);
  }
}
