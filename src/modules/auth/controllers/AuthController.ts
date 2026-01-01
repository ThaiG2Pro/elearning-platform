import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { TokenRepository } from '../repositories/TokenRepository';
import { IdentifyDto } from '../dtos/IdentifyDto';
import { IdentifyResponseDto } from '../dtos/IdentifyResponseDto';
import { RegisterDto } from '../dtos/RegisterDto';
import { ActivateDto } from '../dtos/ActivateDto';
import { RegisterResponseDto } from '../dtos/RegisterResponseDto';
import { ActivateResponseDto } from '../dtos/ActivateResponseDto';
import { LoginDto } from '../dtos/LoginDto';
import { LoginResponseDto } from '../dtos/LoginResponseDto';
import { ForgotDto } from '../dtos/ForgotDto';
import { ForgotResponseDto } from '../dtos/ForgotResponseDto';
import { ResetDto } from '../dtos/ResetDto';
import { ResetResponseDto } from '../dtos/ResetResponseDto';
import { NodemailerEmailAdapter } from '../../../shared/adapters/EmailAdapter';
import { UpdateProfileDto } from '../dtos/UpdateProfileDto';
import { UpdateProfileResponseDto } from '../dtos/UpdateProfileResponseDto';
import { ChangePasswordDto } from '../dtos/ChangePasswordDto';
import { ChangePasswordResponseDto } from '../dtos/ChangePasswordResponseDto';

export class AuthController {
    private authService: AuthService;

    constructor() {
        const userRepository = new UserRepository();
        const tokenRepository = new TokenRepository();
        const emailAdapter = new NodemailerEmailAdapter();
        this.authService = new AuthService(userRepository, tokenRepository, emailAdapter);
    }

    async identify(dto: IdentifyDto): Promise<IdentifyResponseDto> {
        // Validate email format (simple regex)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(dto.email)) {
            throw new Error('INVALID_FORMAT'); // Will be handled in route
        }

        const action = await this.authService.identifyUser(dto.email);
        return new IdentifyResponseDto(action, dto.continueUrl);
    }

    async register(dto: RegisterDto): Promise<RegisterResponseDto> {
        // Basic validation
        if (!dto.email || !dto.password || !dto.fullName) {
            throw new Error('VALIDATION_ERROR');
        }
        return await this.authService.registerNewUser(dto);
    }

    async activate(dto: ActivateDto): Promise<ActivateResponseDto> {
        return await this.authService.activateAccount(dto.token);
    }

    async login(dto: LoginDto): Promise<LoginResponseDto> {
        // Basic validation
        if (!dto.email || !dto.password) {
            throw new Error('VALIDATION_ERROR');
        }
        return await this.authService.login(dto);
    }

    async forgot(dto: ForgotDto): Promise<ForgotResponseDto> {
        // Basic validation
        if (!dto.email) {
            throw new Error('VALIDATION_ERROR');
        }
        return await this.authService.requestPasswordReset(dto.email);
    }

    async reset(dto: ResetDto): Promise<ResetResponseDto> {
        // Basic validation
        if (!dto.token || !dto.password) {
            throw new Error('VALIDATION_ERROR');
        }
        if (dto.password.length < 6) {
            throw new Error('PASSWORD_TOO_SHORT');
        }
        return await this.authService.resetPassword(dto);
    }

    async getProfile(userId: bigint): Promise<{ id: bigint; email: string; fullName: string; age: number; role: string }> {
        return await this.authService.getProfile(userId);
    }

    async updateProfile(userId: bigint, dto: UpdateProfileDto): Promise<UpdateProfileResponseDto> {
        // Basic validation
        if (!dto.fullName) {
            throw new Error('VALIDATION_ERROR');
        }
        return await this.authService.updateProfile(userId, dto);
    }

    async changePassword(userId: bigint, dto: ChangePasswordDto): Promise<ChangePasswordResponseDto> {
        // Basic validation
        if (!dto.currentPassword || !dto.newPassword || !dto.confirmPassword) {
            throw new Error('VALIDATION_ERROR');
        }
        return await this.authService.changePassword(userId, dto);
    }
}
