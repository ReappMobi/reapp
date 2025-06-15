export interface BackendBaseError {
  status: number
  description: string
  data: string[]
}

export enum BackendErrorCodes {
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',

  USER_NOT_FOUND_ERROR = 'USER_NOT_FOUND_ERROR',
  INVALID_TOKEN_ERROR = 'INVALID_TOKEN_ERROR',
  USER_NOT_AUTHORIZED_ERROR = 'USER_NOT_AUTHORIZED_ERROR',

  ZOD_VALIDATION_ERROR = 'ZOD_VALIDATION_ERROR',
}

const GenericErrors = {
  [BackendErrorCodes.INTERNAL_SERVER_ERROR]: {
    status: 500,
    description: 'Erro inter do servidor',
    data: [],
  },
}

const AuthErrors = {
  [BackendErrorCodes.USER_NOT_FOUND_ERROR]: {
    status: 500,
    description: 'Erro interno do servidor',
    data: [],
  },
  [BackendErrorCodes.INVALID_TOKEN_ERROR]: {
    status: 401,
    description: 'O token fornecido está inválido ou já expirou',
    data: ['invitationToken'],
  },
  [BackendErrorCodes.USER_NOT_AUTHORIZED_ERROR]: {
    status: 401,
    description: 'O usuário não tem permissão para acessar este recurso',
    data: [],
  },
}

const ZodErrors = {
  [BackendErrorCodes.ZOD_VALIDATION_ERROR]: {
    status: 400,
    description: 'Erro de validação de dados',
    data: [],
  },
}

export const BackendErrors = {
  ...GenericErrors,
  ...AuthErrors,
  ...ZodErrors,
} as const
