import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MediaService } from '../media-attachment/media-attachment.service';
import { Institution } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AccountService } from '../account/account.service';

const postResponseFields = {
  id: true,
  body: true,
  institution: {
    select: {
      id: true,
      category: {
        select: {
          name: true,
        },
      },
      account: {
        select: {
          id: true,
          name: true,
          avatarId: true,
          media: true,
        },
      },
    },
  },
  mediaId: true,
  media: true,
  createdAt: true,
  updatedAt: true,
  comments: true,
  likes: {
    select: {
      id: true,
      donorId: true,
      donor: {
        select: {
          accountId: true,
        },
      },
    },
  },
};

@Injectable()
export class PostService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
    private readonly accountService: AccountService,
  ) {}

  async postPublication(
    content: string,
    media: Express.Multer.File,
    institutionId: number,
    accountId: number,
  ) {
    if (!content) {
      throw new HttpException(
        'O conteúdo da publicação não pode estar vazio',
        HttpStatus.BAD_REQUEST,
      );
    }

    let mediaId: string | null = null;

    if (media) {
      if (!media.mimetype.startsWith('image/')) {
        throw new HttpException(
          'Only image files are allowed for posts',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const mediaAttachment = await this.mediaService.processMedia(media, {
        accountId,
      });

      mediaId = mediaAttachment.mediaAttachment.id;
    }

    const post = await this.prismaService.post.create({
      data: {
        body: content,
        institution: {
          connect: {
            id: institutionId,
          },
        },
        media: mediaId ? { connect: { id: mediaId } } : undefined,
      },
      select: { ...postResponseFields, media: true },
    });

    return post;
  }

  async getAllPosts() {
    const allPosts = await this.prismaService.post.findMany({
      select: postResponseFields,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return allPosts;
  }

  async getPostsByInstitution(institutionId: number) {
    const posts = await this.prismaService.post.findMany({
      where: {
        institutionId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: postResponseFields,
    });

    return posts;
  }

  async findInstitutionByAccountId(accountId: number): Promise<Institution> {
    return this.prismaService.institution.findUnique({ where: { accountId } });
  }

  async findPostById(postId: number) {
    return this.prismaService.post.findUnique({
      where: { id: postId },
      select: postResponseFields,
    });
  }

  async deletePost(postId: number, userId: number) {
    const institution = await this.findInstitutionByAccountId(userId);
    if (!institution) {
      throw new UnauthorizedException(
        'You are not authorized to perform this action.',
      );
    }

    const institutionId = institution.id;

    const post = await this.findPostById(postId);
    if (!post || post.institution.id !== institutionId) {
      throw new UnauthorizedException(
        'You are not authorized to delete this post.',
      );
    }

    await this.prismaService.post.delete({
      where: { id: postId },
    });
  }

  async updatePost(
    postId: number,
    newCaption: string,
    newFile: Express.Multer.File | null,
    userId: number,
  ) {
    const institution = await this.findInstitutionByAccountId(userId);
    if (!institution) {
      throw new UnauthorizedException(
        'You are not authorized to perform this action.',
      );
    }

    const institutionId = institution.id;

    const post = await this.findPostById(postId);
    if (!post || post.institution.id !== institutionId) {
      throw new UnauthorizedException(
        'You are not authorized to update this post.',
      );
    }

    let mediaId = post.mediaId;

    if (newFile) {
      const mediaAttachment = await this.mediaService.processMedia(newFile, {
        accountId: userId,
      });
      mediaId = mediaAttachment.mediaAttachment.id;
    }

    let updatedPost;
    if (newCaption) {
      updatedPost = await this.prismaService.post.update({
        where: { id: postId },
        data: {
          body: newCaption,
          mediaId,
        },
        select: postResponseFields,
      });
    } else {
      updatedPost = await this.prismaService.post.update({
        where: { id: postId },
        data: {
          mediaId,
        },
        select: postResponseFields,
      });
    }

    const media = await this.mediaService.getMediaAttachmentById(mediaId);

    return {
      ...updatedPost,
      media,
    };
  }

  async addComment(postId: number, accountId: number, body: string) {
    if (!body) {
      throw new HttpException(
        'Por favor, insira o texto do comentário.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const donor = await this.accountService.findOneDonor(accountId);
    if (!donor) {
      throw new HttpException(
        'Não foi possível encontrar a conta do doador associada a este ID.',
        HttpStatus.NOT_FOUND,
      );
    }

    const post = await this.findPostById(postId);
    if (!post) {
      throw new HttpException(
        'Não foi possível encontrar o post associado a este ID.',
        HttpStatus.NOT_FOUND,
      );
    }

    const comment = await this.prismaService.comment.create({
      data: {
        body,
        postId: post.id,
        donorId: donor.id,
      },
    });

    return comment;
  }

  async likePost(postId: number, accountId: number) {
    const donor = await this.accountService.findOneDonor(accountId);
    if (!donor) {
      throw new HttpException(
        'Usuário doador não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    const post = await this.findPostById(postId);
    if (!post) {
      throw new HttpException('Post não encontrado', HttpStatus.NOT_FOUND);
    }

    const existingLike = await this.prismaService.like.findFirst({
      where: { postId, donorId: donor.id },
    });

    if (existingLike) {
      throw new HttpException(
        'Post já curtido pelo usuário',
        HttpStatus.BAD_REQUEST,
      );
    }

    const like = await this.prismaService.like.create({
      data: { postId, donorId: donor.id },
    });

    return like;
  }

  async unlikePost(postId: number, accountId: number) {
    const donor = await this.accountService.findOneDonor(accountId);
    if (!donor) {
      throw new HttpException(
        'Usuário doador não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    const existingLike = await this.prismaService.like.findFirst({
      where: { postId, donorId: donor.id },
    });

    if (!existingLike) {
      throw new HttpException(
        'Esse usuário não curtiu este post',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prismaService.like.delete({
      where: { id: existingLike.id },
    });
  }
}
