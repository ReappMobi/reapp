import { Controller } from '@nestjs/common';
import { Post } from '@nestjs/common';
import { RequestDonationDto } from './dto/request-donation.dto';
import { DonationService } from './donation.service';
import { NotificationRequestDto } from './dto/notification.dto';

@Controller('donation')
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post('request')
  requestDonation(requestDonationDto: RequestDonationDto) {
    return this.donationService.requestDonation(requestDonationDto);
  }

  @Post('notify')
  notifyDonation(requestBody: NotificationRequestDto) {
    return this.donationService.notifyDonation(requestBody);
  }
}
