import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto';
import { LoginGoogleDto } from '../dto/loginGoogle.dto';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            loginWithGoogle: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should call authService.login with the correct data', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password',
      };

      await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('loginWithGoogle', () => {
    it('should call authService.loginWithGoogle with the correct data', async () => {
      const loginGoogleDto: LoginGoogleDto = { idToken: 'test-id-token' };

      await controller.loginWithGoogle(loginGoogleDto);

      expect(authService.loginWithGoogle).toHaveBeenCalledWith(loginGoogleDto);
    });
  });
});
