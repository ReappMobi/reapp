import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../authentication/authentication.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostService } from './post.service';

import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: any;
}

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async postPublication(
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption: string,
    @Body('accountId', ParseIntPipe) accountId: number,
    @Req() req: RequestWithUser,
    @Res() res,
  ) {
    const institution =
      await this.postService.findInstitutionByAccountId(accountId);

    const userId = req.user?.id;

    if (userId !== accountId || !institution) {
      throw new UnauthorizedException();
    }

    const institutionId = institution.id;
    const post = await this.postService.postPublication(
      caption,
      file,
      institutionId,
      accountId,
    );

    return res.status(200).send(post);
  }

  @Get()
  @UseGuards(AuthGuard)
  async getAllPosts(@Req() req: RequestWithUser, @Res() res) {
    const posts = await this.postService.getAllPosts();
    return res.status(HttpStatus.OK).json(posts);
  }

  @Get('institution/:institutionId')
  @UseGuards(AuthGuard)
  async getPostsByInstitution(
    @Param('institutionId', ParseIntPipe) institutionId: number,
    @Req() req: RequestWithUser,
    @Res() res,
  ) {
    const posts = await this.postService.getPostsByInstitution(institutionId);
    return res.status(HttpStatus.OK).json(posts);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deletePost(
    @Param('id', ParseIntPipe) postId: number,
    @Req() req: RequestWithUser,
    @Res() res,
  ) {
    const userId = req.user?.id;
    await this.postService.deletePost(postId, userId);
    return res
      .status(HttpStatus.OK)
      .json({ message: 'Post deleted successfully' });
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async updatePost(
    @Param('id', ParseIntPipe) postId: number,
    @Body('caption') caption: string,
    @UploadedFile() file: Express.Multer.File | null,
    @Req() req: RequestWithUser,
    @Res() res,
  ) {
    const userId = req.user?.id;
    const updatedPost = await this.postService.updatePost(
      postId,
      caption,
      file,
      userId,
    );
    return res.status(HttpStatus.OK).json(updatedPost);
  }
}
