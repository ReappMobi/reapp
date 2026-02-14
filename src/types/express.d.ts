import { LoggedUser } from './logged-user'

declare global {
  // biome-ignore lint/style/noNamespace: Required for Express type augmentation
  namespace Express {
    interface Request {
      user: LoggedUser
    }
  }
}

export {}
