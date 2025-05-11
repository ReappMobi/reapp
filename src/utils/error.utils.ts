import { BackendErrorCodes, BackendErrors } from '@app/types/errors'
import { HttpException } from '@nestjs/common'

export class ReappException<
  T extends BackendErrorCodes = BackendErrorCodes,
> extends HttpException {
  constructor(
    errorCode: T,
    data?:
      | Record<(typeof BackendErrors)[T]['data'][number], unknown>
      | undefined,
  ) {
    const { status, description } =
      BackendErrors[errorCode] ??
      BackendErrors[BackendErrorCodes.INTERNAL_SERVER_ERROR]

    let message = description
    if (data) {
      const dataEntries = Object.entries(data)
      dataEntries.forEach(([key, value]) => {
        const matchKey = `{${key}}`
        const regex = new RegExp(matchKey, 'g')
        message = message.replace(regex, String(value))
      })
    }

    super({ code: errorCode, message, data }, status)
  }

  get data() {
    const { data } = this.getResponse() as { data: Record<string, unknown> }
    return data
  }

  getCode() {
    const { code } = this.getResponse() as { code: BackendErrorCodes }
    return code
  }
}

export const isReappException = <T extends BackendErrorCodes>(
  err: unknown,
  errCode: T,
): err is ReappException<T> => {
  if (!(err as any).code) return false
  const code = (err as any).code
  return code === errCode
}
