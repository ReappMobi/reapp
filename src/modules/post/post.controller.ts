import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
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
    @Req() req: RequestWithUser,
  ) {
    const accountId = req.user?.id;

    if (!accountId) {
      throw new UnauthorizedException();
    }
    const institution =
      await this.postService.findInstitutionByAccountId(accountId);

    if (!institution) {
      throw new UnauthorizedException();
    }

    const institutionId = institution.id;
    const post = await this.postService.postPublication(
      caption,
      file,
      institutionId,
      accountId,
    );
    return post;
  }

  @Get()
  @UseGuards(AuthGuard)
  async getAllPosts() {
    const posts = await this.postService.getAllPosts();
    return posts;
  }

  @Get('institution/:institutionId')
  @UseGuards(AuthGuard)
  async getPostsByInstitution(
    @Param('institutionId', ParseIntPipe) institutionId: number,
  ) {
    const posts = await this.postService.getPostsByInstitution(institutionId);
    return posts;
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deletePost(
    @Param('id', ParseIntPipe) postId: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    await this.postService.deletePost(postId, userId);
    return { message: 'Post deletado com sucesso' };
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async updatePost(
    @Param('id', ParseIntPipe) postId: number,
    @Body('caption') caption: string,
    @UploadedFile() file: Express.Multer.File | null,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    const updatedPost = await this.postService.updatePost(
      postId,
      caption,
      file,
      userId,
    );
    return updatedPost;
  }
}
