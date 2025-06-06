import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Account } from '@prisma/client'
import { AuthGuard } from '../auth/auth.guard'
import { Roles } from '../auth/docorators/roles.decorator'
import { Role } from '../auth/enums/role.enum'
import { AccountService } from './account.service'
import {
  CreateAccountDto,
  CreateAccountGoogleDto,
} from './dto/create-account.dto'
import { GetAccountsQuery } from './dto/get-account-query.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateAccountDto } from './dto/update-account.dto'
import { UpdateAccountStatusDto } from './dto/update-account-dto'

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @UseInterceptors(FileInterceptor('media'))
  create(
    @Body() createAccountDto: CreateAccountDto,
    @UploadedFile() media: Express.Multer.File,
  ) {
    return this.accountService.create(createAccountDto, media)
  }

  @Post('google')
  createWithGoogle(@Body() createAccountGoogleDto: CreateAccountGoogleDto) {
    return this.accountService.createWithGoogle(createAccountGoogleDto)
  }

  @Get('categories')
  findAllCategories() {
    return this.accountService.findAllCategories()
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Get()
  findAll(@Query() query: GetAccountsQuery) {
    return this.accountService.findAll(query)
  }

  @UseGuards(AuthGuard)
  @Post('follow/:id')
  follow(@Req() request: any, @Param('id') id: number) {
    const userId = request.user.id
    return this.accountService.followAccount(userId, +id)
  }

  @UseGuards(AuthGuard)
  @Delete('unfollow/:id')
  unfollow(@Req() request: any, @Param('id') id: number) {
    const userId = request.user.id
    return this.accountService.unfollowAccount(userId, +id)
  }

  @UseGuards(AuthGuard)
  @Get('institution')
  findAllInstitutions(@Req() request: any) {
    const userId = request.user.id
    return this.accountService.findAllInstitutions(userId)
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountService.findOne(+id)
  }

  @UseGuards(AuthGuard)
  @Get('institution/:id')
  findOneInsitution(@Param('id') id: string, @Req() request: any) {
    const userId = request.user.id
    return this.accountService.findOneInstitution(+id, userId)
  }

  @UseGuards(AuthGuard)
  @Get('donor/:id')
  findOneDonor(@Param('id') id: string) {
    return this.accountService.findOneDonor(+id)
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: any) {
    const accountId = request.user.id
    return this.accountService.remove(accountId, +id)
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  @UseInterceptors(FileInterceptor('media'))
  async update(
    @Req() request: any,
    @Body() body: UpdateAccountDto,
    @Param('id') id: number,
    @UploadedFile() media: Express.Multer.File,
  ) {
    const user = request.user as Account
    return this.accountService.update(user, +id, body, media)
  }

  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.accountService.resetPassword(body)
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Patch(':id/status')
  updateStatus(@Param('id') id: number, @Body() body: UpdateAccountStatusDto) {
    return this.accountService.updateStatus(+id, body.status)
  }
}
