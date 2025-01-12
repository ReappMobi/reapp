import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AccountService } from './account.service';
import {
  CreateAccountDto,
  CreateAccountGoogleDto,
} from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AuthGuard } from '../auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @UseInterceptors(FileInterceptor('media'))
  create(
    @Body() createAccountDto: CreateAccountDto,
    @UploadedFile() media: Express.Multer.File,
  ) {
    return this.accountService.create(createAccountDto, media);
  }

  @Post('google')
  createWithGoogle(@Body() createAccountGoogleDto: CreateAccountGoogleDto) {
    return this.accountService.createWithGoogle(createAccountGoogleDto);
  }

  @Get('categories')
  findAllCategories() {
    return this.accountService.findAllCategories();
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.accountService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get('institution')
  findAllInstitutions() {
    return this.accountService.findAllInstitutions();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Get('institution/:id')
  findOneInsitution(@Param('id') id: string) {
    return this.accountService.findOneInstitution(+id);
  }

  @UseGuards(AuthGuard)
  @Get('donor/:id')
  findOneDonor(@Param('id') id: string) {
    return this.accountService.findOneDonor(+id);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: any) {
    const accountId = request.user.id;
    return this.accountService.remove(accountId, +id);
  }

  @UseGuards(AuthGuard)
  @Put()
  @UseInterceptors(FileInterceptor('media'))
  async update(
    @Req() request: any,
    @Body() updateAccountDto: UpdateAccountDto,
    @UploadedFile() media: Express.Multer.File,
  ) {
    const accountId = request.user.id;
    return this.accountService.update(accountId, updateAccountDto, media);
  }
}
