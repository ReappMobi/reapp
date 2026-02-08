import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { MediaService } from '../media-attachment/media-attachment.service'
import { Institution } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AccountService } from '../account/account.service'

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
  likes: {
    select: {
      id: true,
      accountId: true,
    },
  },
  saves: {
    select: {
      id: true,
      accountId: true,
    },
  },
}

const COMMENT_PAGE_SIZE = 10

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
      )
    }

    let mediaId: string | null = null

    if (media) {
      if (!media.mimetype.startsWith('image/')) {
        throw new HttpException(
          'Only image files are allowed for posts',
          HttpStatus.UNPROCESSABLE_ENTITY,
        )
      }

      const mediaAttachment = await this.mediaService.processMedia(media, {
        accountId,
      })

      mediaId = mediaAttachment.mediaAttachment.id
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
    })

    return post
  }

  async getAllPosts(userId?: number) {
    let blockedAccountIds: number[] = []
    if (userId) {
      blockedAccountIds = await this.accountService.getBlockedUserIds(userId)
    }

    const allPosts = await this.prismaService.post.findMany({
      where:
        blockedAccountIds.length > 0
          ? {
              institution: {
                accountId: { notIn: blockedAccountIds },
              },
            }
          : undefined,
      select: postResponseFields,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return allPosts
  }

  async getPostById(id: number) {
    const post = await this.prismaService.post.findMany({
      where: {
        id,
      },
    })
    return post
  }

  async getPostComments(id: number, page: number) {
    const comments = await this.prismaService.comment.findMany({
      where: {
        postId: id,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        account: {
          select: {
            name: true,
            media: true,
          },
        },
      },
      skip: (page - 1) * COMMENT_PAGE_SIZE,
      take: COMMENT_PAGE_SIZE,
    })

    return comments
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
    })

    return posts
  }

  async findInstitutionByAccountId(accountId: number): Promise<Institution> {
    return this.prismaService.institution.findUnique({ where: { accountId } })
  }

  async findPostById(postId: number) {
    return this.prismaService.post.findUnique({
      where: { id: postId },
      select: postResponseFields,
    })
  }

  async deletePost(postId: number, userId: number) {
    const institution = await this.findInstitutionByAccountId(userId)
    if (!institution) {
      throw new UnauthorizedException(
        'You are not authorized to perform this action.',
      )
    }

    const institutionId = institution.id

    const post = await this.findPostById(postId)
    if (!post || post.institution.id !== institutionId) {
      throw new UnauthorizedException(
        'You are not authorized to delete this post.',
      )
    }

    await this.prismaService.post.delete({
      where: { id: postId },
    })
  }

  async updatePost(
    postId: number,
    newCaption: string,
    newFile: Express.Multer.File | null,
    userId: number,
  ) {
    const institution = await this.findInstitutionByAccountId(userId)
    if (!institution) {
      throw new UnauthorizedException(
        'You are not authorized to perform this action.',
      )
    }

    const institutionId = institution.id

    const post = await this.findPostById(postId)
    if (!post || post.institution.id !== institutionId) {
      throw new UnauthorizedException(
        'You are not authorized to update this post.',
      )
    }

    let mediaId = post.mediaId

    if (newFile) {
      const mediaAttachment = await this.mediaService.processMedia(newFile, {
        accountId: userId,
      })
      mediaId = mediaAttachment.mediaAttachment.id
    }

    let updatedPost
    if (newCaption) {
      updatedPost = await this.prismaService.post.update({
        where: { id: postId },
        data: {
          body: newCaption,
          mediaId,
        },
        select: postResponseFields,
      })
    } else {
      updatedPost = await this.prismaService.post.update({
        where: { id: postId },
        data: {
          mediaId,
        },
        select: postResponseFields,
      })
    }

    const media = await this.mediaService.getMediaAttachmentById(mediaId)

    return {
      ...updatedPost,
      media,
    }
  }

  async addComment(postId: number, accountId: number, body: string) {
    if (!accountId) {
      throw new HttpException(
        'Você precisa estar logado para comentar.',
        HttpStatus.UNAUTHORIZED,
      )
    }

    if (!body) {
      throw new HttpException(
        'Por favor, insira o texto do comentário.',
        HttpStatus.BAD_REQUEST,
      )
    }

    const post = await this.findPostById(postId)
    if (!post) {
      throw new HttpException(
        'Não foi possível encontrar o post associado a este ID.',
        HttpStatus.NOT_FOUND,
      )
    }

    const comment = await this.prismaService.comment.create({
      data: {
        body,
        postId: post.id,
        accountId,
      },
    })

    return comment
  }

  async likePost(postId: number, accountId: number) {
    const post = await this.findPostById(postId)
    if (!post) {
      throw new HttpException('Post não encontrado', HttpStatus.NOT_FOUND)
    }

    const existingLike = await this.prismaService.like.findFirst({
      where: { postId, accountId },
    })

    if (existingLike) {
      throw new HttpException(
        'Post já curtido pelo usuário',
        HttpStatus.BAD_REQUEST,
      )
    }

    const like = await this.prismaService.like.create({
      data: { postId, accountId },
    })

    return like
  }

  async unlikePost(postId: number, accountId: number) {
    const existingLike = await this.prismaService.like.findFirst({
      where: { postId, accountId },
    })

    if (!existingLike) {
      throw new HttpException(
        'Esse usuário não curtiu este post',
        HttpStatus.BAD_REQUEST,
      )
    }

    await this.prismaService.like.delete({
      where: { id: existingLike.id },
    })
  }

  async savePost(postId: number, accountId: number) {
    const post = await this.findPostById(postId)
    if (!post) {
      throw new HttpException('Post não encontrado', HttpStatus.NOT_FOUND)
    }

    const existingSavedPost = await this.prismaService.save.findFirst({
      where: { postId, accountId },
    })

    if (existingSavedPost) {
      throw new HttpException(
        'Post já salvo pelo usuário',
        HttpStatus.BAD_REQUEST,
      )
    }

    const save = await this.prismaService.save.create({
      data: { postId, accountId },
    })

    return save
  }

  async unsavePost(postId: number, accountId: number) {
    const post = await this.findPostById(postId)
    if (!post) {
      throw new HttpException('Post não encontrado', HttpStatus.NOT_FOUND)
    }

    const existingSavedPost = await this.prismaService.save.findFirst({
      where: { postId, accountId },
    })

    if (!existingSavedPost) {
      throw new HttpException(
        'Este Post não foi salvo pelo usuário',
        HttpStatus.BAD_REQUEST,
      )
    }

    await this.prismaService.save.delete({
      where: { id: existingSavedPost.id },
    })
  }

  async findSavedPostsByUserId(accountId: number) {
    const posts = await this.prismaService.save.findMany({
      where: { accountId },
      select: {
        post: {
          select: postResponseFields,
        },
      },
    })

    return posts.map((save) => save.post)
  }
}
