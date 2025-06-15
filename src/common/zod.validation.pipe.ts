import { BackendErrorCodes } from '@app/types/errors'
import { ReappException } from '@app/utils/error.utils'
import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from '@nestjs/common'
import { ZodError, ZodSchema } from 'zod'

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      const result = this.schema.parse(value)
      return result
    } catch (error) {
      const data: Record<string, string> = {}
      if (error instanceof ZodError) {
        error.issues.forEach((issue) => {
          if (issue.path.length > 0) {
            const key = issue.path.join('.')
            data[key] = issue.message
          } else {
            data[issue.message] = issue.message
          }
        })
      }
      throw new ReappException(BackendErrorCodes.ZOD_VALIDATION_ERROR, data)
    }
  }
}
