import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { FileInterceptor } from '@nestjs/platform-express'
import { PostService } from './post.service'

import { Request } from 'express'

interface RequestWithUser extends Request {
  user?: any
}

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('media'))
  async postPublication(
    @UploadedFile() media: Express.Multer.File,
    @Body('content') content: string,
    @Req() req: RequestWithUser,
  ) {
    const accountId = req.user?.id

    if (!accountId) {
      throw new UnauthorizedException('Usuário não autenticado')
    }

    const institution =
      await this.postService.findInstitutionByAccountId(accountId)

    if (!institution) {
      throw new UnauthorizedException('Usuário não é uma instituição')
    }

    const institutionId = institution.id
    return this.postService.postPublication(
      content,
      media,
      institutionId,
      accountId,
    )
  }

  @Get()
  @UseGuards(AuthGuard)
  async getAllPosts(@Req() req: RequestWithUser) {
    const userId = req.user?.id
    const posts = await this.postService.getAllPosts(userId)
    return posts
  }

  @Get('/saved')
  @UseGuards(AuthGuard)
  async getSavedPostsByUserId(@Req() req: RequestWithUser) {
    const userId = req.user?.id
    const savedPosts = await this.postService.findSavedPostsByUserId(userId)
    return savedPosts
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async getPostById(@Param('id', ParseIntPipe) id: number) {
    const posts = await this.postService.getPostById(id)
    return posts
  }
  @Get(':id/comments')
  @UseGuards(AuthGuard)
  async getPostComments(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', ParseIntPipe) page: number,
  ) {
    return await this.postService.getPostComments(id, page)
  }

  @Get('institution/:institutionId')
  @UseGuards(AuthGuard)
  async getPostsByInstitution(
    @Param('institutionId', ParseIntPipe) institutionId: number,
  ) {
    const posts = await this.postService.getPostsByInstitution(institutionId)
    return posts
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deletePost(
    @Param('id', ParseIntPipe) postId: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id
    await this.postService.deletePost(postId, userId)
    return { message: 'Post deletado com sucesso' }
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
    const userId = req.user?.id
    const updatedPost = await this.postService.updatePost(
      postId,
      caption,
      file,
      userId,
    )
    return updatedPost
  }

  @Post(':id/comment')
  @UseGuards(AuthGuard)
  async addComment(
    @Param('id', ParseIntPipe) postId: number,
    @Body('body') body: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id
    const comment = await this.postService.addComment(postId, userId, body)
    return comment
  }

  @Post(':id/like')
  @UseGuards(AuthGuard)
  async likePost(
    @Param('id', ParseIntPipe) postId: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id
    const like = await this.postService.likePost(postId, userId)
    return like
  }

  @Delete(':id/like')
  @UseGuards(AuthGuard)
  async unlikePost(
    @Param('id', ParseIntPipe) postId: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id
    await this.postService.unlikePost(postId, userId)
    return { message: 'Post descurtido com sucesso' }
  }

  @Post(':id/save')
  @UseGuards(AuthGuard)
  async savePost(
    @Param('id', ParseIntPipe) postId: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id
    const savedPost = await this.postService.savePost(postId, userId)
    return savedPost
  }

  @Delete(':id/save')
  @UseGuards(AuthGuard)
  async unsavePost(
    @Param('id', ParseIntPipe) postId: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id
    await this.postService.unsavePost(postId, userId)
    return { message: 'Post retirado dos salvos com sucesso' }
  }
}
