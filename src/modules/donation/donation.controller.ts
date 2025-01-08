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
  x;
  @Get('all')
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.donationService.getAllDonations(page, limit);
  }

  @Get('institution/:institutionId')
  findByInstitution(
    @Param('institutionId') institutionId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.donationService.getDonationsByInstitution(
      institutionId,
      page,
      limit,
    );
  }

  @Get('project/:projectId')
  findByProject(
    @Param('projectId') projectId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.donationService.getDonationsByInstitution(
      projectId,
      page,
      limit,
    );
  }

  @Get('donor/:donorId')
  findByDonor(
    @Param('donorId') donorId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('institutionId') institutionId: number = null,
    @Query('projectId') projectId: number = null,
  ) {
    return this.donationService.getDonationsByDonor(
      donorId,
      page,
      limit,
      institutionId,
      projectId,
    );
  }

  @Post('notify')
  notifyDonation(requestBody: NotificationRequestDto) {
    return this.donationService.notifyDonation(requestBody);
  }
}
