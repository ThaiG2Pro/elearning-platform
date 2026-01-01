import { NavigationAction } from '../domain/NavigationAction';
import { IdentityPolicy } from '../domain/IdentityPolicy';
import { RegistrationPolicy } from '../domain/RegistrationPolicy';
import { TokenPolicy } from '../domain/TokenPolicy';
import { UserFactory } from '../domain/UserFactory';
import { UserEntity } from '../domain/UserEntity';
import { UserRepository } from '../repositories/UserRepository';
import { TokenRepository } from '../repositories/TokenRepository';
import { RegisterDto } from '../dtos/RegisterDto';
import { RegisterResponseDto } from '../dtos/RegisterResponseDto';
import { ActivateResponseDto } from '../dtos/ActivateResponseDto';
import { LoginDto } from '../dtos/LoginDto';
import { LoginResponseDto } from '../dtos/LoginResponseDto';
import { ForgotResponseDto } from '../dtos/ForgotResponseDto';
import { ResetDto } from '../dtos/ResetDto';
import { ResetResponseDto } from '../dtos/ResetResponseDto';
import { NodemailerEmailAdapter } from '../../../shared/adapters/EmailAdapter';
import { TokenFactory } from '../domain/TokenFactory';
import { LoginNavigationPolicy } from '../domain/LoginNavigationPolicy';
import { RecoveryPolicy } from '../domain/RecoveryPolicy';
import { UpdateProfileDto } from '../dtos/UpdateProfileDto';
import { UpdateProfileResponseDto } from '../dtos/UpdateProfileResponseDto';
import { ChangePasswordDto } from '../dtos/ChangePasswordDto';
import { ChangePasswordResponseDto } from '../dtos/ChangePasswordResponseDto';

export class AuthService {
    constructor(
        private userRepository: UserRepository,
        private tokenRepository: TokenRepository,
        private emailAdapter: NodemailerEmailAdapter,
    ) { }

    async identifyUser(email: string): Promise<NavigationAction> {
        const user = await this.userRepository.findByEmail(email);
        return IdentityPolicy.determineNextAction(user);
    }

    async registerNewUser(dto: RegisterDto): Promise<RegisterResponseDto> {
        // BR-PR-01: Lazy Cleanup
        await this.userRepository.deleteInactiveUsersOlderThan24Hours();

        const existingUser = await this.userRepository.findByEmail(dto.email);
        const eligibility = RegistrationPolicy.validateRegistrationEligibility(existingUser);

        if (eligibility === 'REJECT') {
            throw new Error('USER_ALREADY_ACTIVE');
        }

        let userEntity: UserEntity;
        if (eligibility === 'OVERWRITE') {
            userEntity = await UserFactory.reconstituteForOverwrite(existingUser!, dto.password, dto.fullName, dto.age);
        } else {
            userEntity = await UserFactory.createInactiveUser(dto.email, dto.password, dto.fullName, dto.age);
        }

        await this.userRepository.save(userEntity);

        // BR-TK-03: Auto Revoke - Revoke old activation tokens for this user
        await this.tokenRepository.revokeAllByType(userEntity.id, 'ACTIVATION');

        // Create token
        const tokenEntity = TokenFactory.createActivationToken(userEntity.id);
        await this.tokenRepository.save(tokenEntity);

        // Send email async (after DB commit)
        setImmediate(() => {
            try {
                this.emailAdapter.sendActivationEmail(dto.email, tokenEntity.code);
            } catch (error) {
                console.error('Failed to send activation email:', error);
            }
        });

        return new RegisterResponseDto('Activation email sent', dto.email);
    }

    async activateAccount(tokenStr: string): Promise<ActivateResponseDto> {
        // Find token
        const tokenEntity = await this.tokenRepository.findByCode(tokenStr);
        const validToken = TokenPolicy.validateActivationToken(tokenEntity);

        // Find user
        const user = await this.userRepository.findById(validToken.userId);
        if (!user) throw new Error('USER_NOT_FOUND');

        // Activate user (Rich Domain)
        user.activate();
        await this.userRepository.save(user);

        // Consume token
        await this.tokenRepository.markAsUsed(validToken);

        // BR-PR-03: Role-based Redirect - Default redirect based on role
        const redirectUrl = LoginNavigationPolicy.determineRedirectUrl(user);
        return new ActivateResponseDto(true, redirectUrl);
    }

    async login(dto: LoginDto): Promise<LoginResponseDto> {
        // Retrieve user
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user) {
            throw new Error('AUTH_FAILED');
        }

        // Rich domain validation
        const passwordMatch = await user.matchPassword(dto.password);
        if (!passwordMatch) {
            throw new Error('AUTH_FAILED');
        }

        const isActive = user.isActive();
        if (!isActive) {
            throw new Error('USER_INACTIVE');
        }

        // Issue tokens
        const tokens = TokenFactory.createAuthTokens(user);

        // Update state
        user.updateLastLogin();
        await this.userRepository.save(user);

        // Navigation
        const redirectUrl = LoginNavigationPolicy.determineRedirectUrl(user, dto.continueUrl);

        return new LoginResponseDto(
            tokens.accessToken,
            tokens.refreshToken,
            {
                id: Number(user.id), // Convert BigInt to number for JSON serialization
                email: user.email,
                role: user.roleName,
                fullName: user.fullName,
            },
            redirectUrl,
        );
    }

    async requestPasswordReset(email: string): Promise<ForgotResponseDto> {
        const user = await this.userRepository.findByEmail(email);

        if (user && user.isActive()) {
            // Revoke old recovery tokens
            await this.tokenRepository.revokeAllByType(user.id, 'RECOVERY');

            // Create new recovery token
            const tokenEntity = TokenFactory.createRecoveryToken(user.id);
            await this.tokenRepository.save(tokenEntity);

            // Send email async
            setImmediate(() => {
                this.emailAdapter.sendRecoveryEmail(email, tokenEntity.code);
            });
        }
        // Always return success to prevent enumeration
        return new ForgotResponseDto('If the email exists, a reset link has been sent.');
    }

    async resetPassword(dto: ResetDto): Promise<ResetResponseDto> {
        // Validate token
        const tokenEntity = await this.tokenRepository.findByCode(dto.token);
        const validToken = RecoveryPolicy.validateRecoveryToken(tokenEntity);

        // Find user
        const user = await this.userRepository.findById(validToken.userId);
        if (!user) throw new Error('USER_NOT_FOUND');

        // Change password (Rich Domain)
        await user.changePassword(dto.password);
        await this.userRepository.save(user);

        // Cleanup
        await this.tokenRepository.markAsUsed(validToken);

        // BR-PR-02: Intent Reset - Redirect to home instead of preserving continue_url
        return new ResetResponseDto('Password reset successful', '/');
    }

    async getProfile(userId: bigint): Promise<{ id: bigint; email: string; fullName: string; age: number; role: string }> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            age: user.age || 0,
            role: user.roleName,
        };
    }

    async updateProfile(userId: bigint, dto: UpdateProfileDto): Promise<UpdateProfileResponseDto> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        // BR-ID-05: Age Constraint
        if (dto.age !== undefined && dto.age <= 0) {
            throw new Error('INVALID_AGE');
        }

        // Update profile in domain entity
        user.updateProfile(dto.fullName, dto.age);

        // Save to repository
        await this.userRepository.save(user);

        return new UpdateProfileResponseDto(true, 'Profile updated successfully');
    }

    async changePassword(userId: bigint, dto: ChangePasswordDto): Promise<ChangePasswordResponseDto> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        // Verify current password
        const isCurrentPasswordValid = await user.matchPassword(dto.currentPassword);
        if (!isCurrentPasswordValid) {
            throw new Error('CURRENT_PASSWORD_INVALID');
        }

        // Check if new password matches confirmation
        if (dto.newPassword !== dto.confirmPassword) {
            throw new Error('PASSWORD_CONFIRMATION_MISMATCH');
        }

        // Basic password strength check (at least 6 characters) - BR-ID-04
        if (dto.newPassword.length < 6) {
            throw new Error('PASSWORD_TOO_WEAK');
        }

        // Change password in domain entity
        await user.changePassword(dto.newPassword);

        // Save to repository
        await this.userRepository.save(user);

        return new ChangePasswordResponseDto(true, 'Password changed successfully');
    }
}
