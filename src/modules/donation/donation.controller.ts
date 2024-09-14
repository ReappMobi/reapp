import { Controller } from '@nestjs/common';
import { Post } from '@nestjs/common';
import { RequestDonationDto } from './dto/request-donation.dto';
import { DonationService } from './donation.service';

@Controller('donation')
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post('request')
  requestDonation(requestDonationDto: RequestDonationDto) {
    return this.donationService.requestDonation(requestDonationDto);
  }

  @Post('notify')
  callbackDonation() {
    return this.donationService.notifyDonation();
  }
}
