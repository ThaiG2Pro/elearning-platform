import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../AuthService';
import { UserEntity } from '../../domain/UserEntity';
import { TokenEntity } from '../../domain/TokenEntity';
import { RegisterDto } from '../../dtos/RegisterDto';
import { LoginDto } from '../../dtos/LoginDto';
import { ResetDto } from '../../dtos/ResetDto';
import { ChangePasswordDto } from '../../dtos/ChangePasswordDto';

// UserFactory calls Prisma directly (existing code). Mock it so service tests stay DB-free.
vi.mock('../../domain/UserFactory', () => ({
    UserFactory: {
        createInactiveUser: vi.fn(),
        reconstituteForOverwrite: vi.fn(),
    },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const future = new Date(Date.now() + 3_600_000);
const past   = new Date(Date.now() - 3_600_000);

const makeUser = (status = 'ACTIVE', role = 'STUDENT') =>
    new UserEntity(1n, 'user@test.com', '$2a$10$invalidhash', status, role, 'Test User', 25);

const makeToken = (type = 'ACTIVATION', overrides: Partial<{ expiresAt: Date; isUsed: boolean }> = {}) =>
    new TokenEntity(1n, 1n, 'valid-uuid-code', type, overrides.expiresAt ?? future, overrides.isUsed ?? false);

// ── Mock factory ─────────────────────────────────────────────────────────────

const makeUserRepo = () => ({
    findByEmail: vi.fn(),
    findById: vi.fn(),
    save: vi.fn(),
    deleteInactiveUsersOlderThan24Hours: vi.fn(),
    invalidateAllTokens: vi.fn(),
});

const makeTokenRepo = () => ({
    findByCode: vi.fn(),
    save: vi.fn(),
    markAsUsed: vi.fn(),
    revokeAllByType: vi.fn(),
    deleteExpiredTokens: vi.fn(),
});

const makeEmailAdapter = () => ({
    sendActivationEmail: vi.fn(),
    sendRecoveryEmail: vi.fn(),
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService — integration (mocked repos)', () => {
    let userRepo: ReturnType<typeof makeUserRepo>;
    let tokenRepo: ReturnType<typeof makeTokenRepo>;
    let emailAdapter: ReturnType<typeof makeEmailAdapter>;
    let service: AuthService;

    beforeEach(() => {
        userRepo     = makeUserRepo();
        tokenRepo    = makeTokenRepo();
        emailAdapter = makeEmailAdapter();
        service = new AuthService(userRepo as any, tokenRepo as any, emailAdapter as any);
    });

    // ── registerNewUser ───────────────────────────────────────────────────────
    describe('registerNewUser', () => {
        const dto = new RegisterDto('new@test.com', 'Password1!', 'New User', 25, '/dashboard');

        it('creates a new user and returns confirmation for a fresh email', async () => {
            const { UserFactory } = await import('../../domain/UserFactory');
            const newUser = makeUser('INACTIVE');
            (UserFactory.createInactiveUser as ReturnType<typeof vi.fn>).mockResolvedValue(newUser);

            userRepo.deleteInactiveUsersOlderThan24Hours.mockResolvedValue(undefined);
            userRepo.findByEmail.mockResolvedValue(null);
            userRepo.save.mockResolvedValue(undefined);
            tokenRepo.revokeAllByType.mockResolvedValue(undefined);
            tokenRepo.save.mockResolvedValue(undefined);

            const result = await service.registerNewUser(dto);

            expect(userRepo.save).toHaveBeenCalledOnce();
            expect(tokenRepo.save).toHaveBeenCalledOnce();
            expect(result.email).toBe('new@test.com');
        });

        it('throws USER_ALREADY_ACTIVE when email is already registered and active', async () => {
            userRepo.deleteInactiveUsersOlderThan24Hours.mockResolvedValue(undefined);
            userRepo.findByEmail.mockResolvedValue(makeUser('ACTIVE'));

            await expect(service.registerNewUser(dto)).rejects.toThrow('USER_ALREADY_ACTIVE');
        });

        // BR-TK-03: re-registering an INACTIVE email must kill the previous
        // activation token before a new one is saved, or the old emailed link
        // could still activate the overwritten account.
        it('revokes old ACTIVATION tokens before issuing a new one on INACTIVE overwrite', async () => {
            const { UserFactory } = await import('../../domain/UserFactory');
            const existing = makeUser('INACTIVE');
            (UserFactory.reconstituteForOverwrite as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

            userRepo.deleteInactiveUsersOlderThan24Hours.mockResolvedValue(undefined);
            userRepo.findByEmail.mockResolvedValue(existing);
            userRepo.save.mockResolvedValue(undefined);
            tokenRepo.revokeAllByType.mockResolvedValue(undefined);
            tokenRepo.save.mockResolvedValue(undefined);

            await service.registerNewUser(dto);

            expect(tokenRepo.revokeAllByType).toHaveBeenCalledWith(existing.id, 'ACTIVATION');
            const revokeOrder = tokenRepo.revokeAllByType.mock.invocationCallOrder[0];
            const saveOrder   = tokenRepo.save.mock.invocationCallOrder[0];
            expect(revokeOrder).toBeLessThan(saveOrder);
        });
    });

    // ── activateAccount ───────────────────────────────────────────────────────
    describe('activateAccount', () => {
        it('activates the account with a valid token', async () => {
            const token = makeToken('ACTIVATION');
            const user  = makeUser('INACTIVE');
            tokenRepo.findByCode.mockResolvedValue(token);
            userRepo.findById.mockResolvedValue(user);
            userRepo.save.mockResolvedValue(undefined);
            tokenRepo.markAsUsed.mockResolvedValue(undefined);

            const result = await service.activateAccount('valid-uuid-code');

            expect(user.status).toBe('ACTIVE');
            expect(userRepo.save).toHaveBeenCalledOnce();
            expect(result.success).toBe(true);
        });

        it('throws TOKEN_INVALID when token is expired', async () => {
            tokenRepo.findByCode.mockResolvedValue(makeToken('ACTIVATION', { expiresAt: past }));
            await expect(service.activateAccount('expired-code')).rejects.toThrow('TOKEN_INVALID');
        });

        it('throws TOKEN_INVALID when token is already used', async () => {
            tokenRepo.findByCode.mockResolvedValue(makeToken('ACTIVATION', { isUsed: true }));
            await expect(service.activateAccount('used-code')).rejects.toThrow('TOKEN_INVALID');
        });

        it('throws TOKEN_INVALID when token does not exist', async () => {
            tokenRepo.findByCode.mockResolvedValue(null);
            await expect(service.activateAccount('unknown-code')).rejects.toThrow('TOKEN_INVALID');
        });
    });

    // ── resetPassword ─────────────────────────────────────────────────────────
    describe('resetPassword', () => {
        it('changes password successfully with valid recovery token', async () => {
            const token = makeToken('RECOVERY');
            const user  = makeUser('ACTIVE');
            tokenRepo.findByCode.mockResolvedValue(token);
            userRepo.findById.mockResolvedValue(user);
            userRepo.save.mockResolvedValue(undefined);
            tokenRepo.markAsUsed.mockResolvedValue(undefined);

            const dto = new ResetDto('valid-uuid-code', 'NewPassword1!');
            const result = await service.resetPassword(dto);

            expect(userRepo.save).toHaveBeenCalledOnce();
            expect(tokenRepo.markAsUsed).toHaveBeenCalledOnce();
            expect(result.redirect).toBe('/');
        });

        it('throws TOKEN_INVALID for an expired recovery token', async () => {
            tokenRepo.findByCode.mockResolvedValue(makeToken('RECOVERY', { expiresAt: past }));
            await expect(service.resetPassword(new ResetDto('code', 'pass'))).rejects.toThrow('TOKEN_INVALID');
        });

        // Token-type confusion: an emailed ACTIVATION link must never double
        // as a password-reset credential.
        it('throws TOKEN_INVALID for an ACTIVATION-type token and does not touch the user', async () => {
            tokenRepo.findByCode.mockResolvedValue(makeToken('ACTIVATION'));
            await expect(service.resetPassword(new ResetDto('activation-code', 'NewPass1!')))
                .rejects.toThrow('TOKEN_INVALID');
            expect(userRepo.save).not.toHaveBeenCalled();
            expect(tokenRepo.markAsUsed).not.toHaveBeenCalled();
        });
    });

    // ── requestPasswordReset ──────────────────────────────────────────────────
    describe('requestPasswordReset', () => {
        it('revokes old RECOVERY tokens before issuing a new one', async () => {
            const user = makeUser('ACTIVE');
            userRepo.findByEmail.mockResolvedValue(user);
            tokenRepo.revokeAllByType.mockResolvedValue(undefined);
            tokenRepo.save.mockResolvedValue(undefined);

            await service.requestPasswordReset('user@test.com');

            expect(tokenRepo.revokeAllByType).toHaveBeenCalledWith(user.id, 'RECOVERY');
            const revokeOrder = tokenRepo.revokeAllByType.mock.invocationCallOrder[0];
            const saveOrder   = tokenRepo.save.mock.invocationCallOrder[0];
            expect(revokeOrder).toBeLessThan(saveOrder);
        });

        // Enumeration parity: response must be byte-identical whether or not
        // the email exists, and an unknown email must never throw.
        it('returns the same message for an existing and an unknown email', async () => {
            const user = makeUser('ACTIVE');
            userRepo.findByEmail.mockResolvedValueOnce(user);
            tokenRepo.revokeAllByType.mockResolvedValue(undefined);
            tokenRepo.save.mockResolvedValue(undefined);
            const known = await service.requestPasswordReset('user@test.com');

            userRepo.findByEmail.mockResolvedValueOnce(null);
            const unknown = await service.requestPasswordReset('nobody@test.com');

            expect(JSON.stringify(unknown)).toBe(JSON.stringify(known));
        });

        it('does not throw and issues no token for an unknown email', async () => {
            userRepo.findByEmail.mockResolvedValue(null);
            await expect(service.requestPasswordReset('nobody@test.com')).resolves.toBeDefined();
            expect(tokenRepo.save).not.toHaveBeenCalled();
            expect(tokenRepo.revokeAllByType).not.toHaveBeenCalled();
        });
    });

    // ── response-shape guards ─────────────────────────────────────────────────
    // The DTO mapping is hand-written in several places; these pin that no
    // future `...user` spread ships the bcrypt hash to the client.
    describe('sensitive-field leakage', () => {
        it('login response contains no passwordHash', async () => {
            vi.stubEnv('JWT_SECRET', 'test-secret-for-auth-service');
            try {
                const bcrypt = await import('bcryptjs');
                const user = makeUser('ACTIVE');
                user.passwordHash = await bcrypt.hash('RealPass1!', 10);
                userRepo.findByEmail.mockResolvedValue(user);
                userRepo.save.mockResolvedValue(undefined);

                const result = await service.login(new LoginDto('user@test.com', 'RealPass1!'));

                expect(JSON.stringify(result)).not.toContain('passwordHash');
                expect(JSON.stringify(result)).not.toContain(user.passwordHash);
            } finally {
                vi.unstubAllEnvs();
            }
        });

        it('getProfile result contains no passwordHash', async () => {
            const user = makeUser('ACTIVE');
            userRepo.findById.mockResolvedValue(user);

            const profile = await service.getProfile(1n);

            expect(JSON.stringify(profile, (_, v) => typeof v === 'bigint' ? v.toString() : v))
                .not.toContain('passwordHash');
        });
    });

    // ── updateProfile ─────────────────────────────────────────────────────────
    describe('updateProfile', () => {
        it('throws INVALID_AGE when age is 0 or negative', async () => {
            userRepo.findById.mockResolvedValue(makeUser());
            const { UpdateProfileDto } = await import('../../dtos/UpdateProfileDto');
            await expect(service.updateProfile(1n, new UpdateProfileDto('Name', 0))).rejects.toThrow('INVALID_AGE');
            await expect(service.updateProfile(1n, new UpdateProfileDto('Name', -5))).rejects.toThrow('INVALID_AGE');
        });
    });

    // ── changePassword ────────────────────────────────────────────────────────
    describe('changePassword', () => {
        it('throws PASSWORD_CONFIRMATION_MISMATCH when new passwords do not match', async () => {
            userRepo.findById.mockResolvedValue(makeUser());
            // We need a real bcrypt hash so matchPassword returns true
            const bcrypt = await import('bcryptjs');
            const user = makeUser();
            user.passwordHash = await bcrypt.hash('CurrentPass1!', 10);
            userRepo.findById.mockResolvedValue(user);

            const dto = new ChangePasswordDto('CurrentPass1!', 'NewPass1!', 'DifferentPass1!');
            await expect(service.changePassword(1n, dto)).rejects.toThrow('PASSWORD_CONFIRMATION_MISMATCH');
        });

        it('throws PASSWORD_TOO_WEAK when new password is shorter than 6 characters', async () => {
            const bcrypt = await import('bcryptjs');
            const user = makeUser();
            user.passwordHash = await bcrypt.hash('CurrentPass1!', 10);
            userRepo.findById.mockResolvedValue(user);

            const dto = new ChangePasswordDto('CurrentPass1!', '1234', '1234');
            await expect(service.changePassword(1n, dto)).rejects.toThrow('PASSWORD_TOO_WEAK');
        });
    });

    // ── updateAvatar (WP1.5.6) ────────────────────────────────────────────────
    describe('updateAvatar', () => {
        it('throws INVALID_AVATAR for a non-data-URL value', async () => {
            userRepo.findById.mockResolvedValue(makeUser());
            const { UpdateAvatarDto } = await import('../../dtos/UpdateAvatarDto');
            await expect(service.updateAvatar(1n, new UpdateAvatarDto('https://evil.example/x.jpg')))
                .rejects.toThrow('INVALID_AVATAR');
        });

        it('throws AVATAR_TOO_LARGE when the data URL exceeds the cap', async () => {
            userRepo.findById.mockResolvedValue(makeUser());
            const { UpdateAvatarDto } = await import('../../dtos/UpdateAvatarDto');
            const huge = 'data:image/jpeg;base64,' + 'a'.repeat(500_000);
            await expect(service.updateAvatar(1n, new UpdateAvatarDto(huge)))
                .rejects.toThrow('AVATAR_TOO_LARGE');
        });

        it('updates avatarUrl for a valid small data URL', async () => {
            const user = makeUser();
            userRepo.findById.mockResolvedValue(user);
            userRepo.save.mockResolvedValue(undefined);
            const { UpdateAvatarDto } = await import('../../dtos/UpdateAvatarDto');

            const dataUrl = 'data:image/jpeg;base64,abc123';
            const result = await service.updateAvatar(1n, new UpdateAvatarDto(dataUrl));
            expect(user.avatarUrl).toBe(dataUrl);
            expect(result.success).toBe(true);
        });
    });

    // ── deleteAccount (WP1.5.6) ───────────────────────────────────────────────
    describe('deleteAccount', () => {
        it('throws CURRENT_PASSWORD_INVALID for a wrong password', async () => {
            const bcrypt = await import('bcryptjs');
            const user = makeUser();
            user.passwordHash = await bcrypt.hash('RealPass1!', 10);
            userRepo.findById.mockResolvedValue(user);
            const { DeleteAccountDto } = await import('../../dtos/DeleteAccountDto');

            await expect(service.deleteAccount(1n, new DeleteAccountDto('WrongPass1!')))
                .rejects.toThrow('CURRENT_PASSWORD_INVALID');
            expect(userRepo.save).not.toHaveBeenCalled();
        });

        it('soft-deletes (status DELETED) and invalidates tokens on a correct password', async () => {
            const bcrypt = await import('bcryptjs');
            const user = makeUser();
            user.passwordHash = await bcrypt.hash('RealPass1!', 10);
            userRepo.findById.mockResolvedValue(user);
            userRepo.save.mockResolvedValue(undefined);
            userRepo.invalidateAllTokens.mockResolvedValue(undefined);
            const { DeleteAccountDto } = await import('../../dtos/DeleteAccountDto');

            const result = await service.deleteAccount(1n, new DeleteAccountDto('RealPass1!'));
            expect(user.status).toBe('DELETED');
            expect(user.isActive()).toBe(false);
            expect(userRepo.save).toHaveBeenCalledOnce();
            expect(userRepo.invalidateAllTokens).toHaveBeenCalledWith(1n);
            expect(result.success).toBe(true);
        });
    });
});
