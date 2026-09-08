import { describe, it, expect, vi } from 'vitest';

// Security fix: email chưa từng được chuẩn hoá chữ thường ở đâu cả —
// "Foo@Example.com" và "foo@example.com" trước đây tạo được 2 tài
// khoản khác nhau (cột unique nhưng so sánh phân biệt hoa/thường), và
// login/quên-mật-khẩu thất bại nếu người dùng gõ khác hoa/thường lúc
// đăng ký. UserRepository giờ chuẩn hoá (trim + lowercase) ở cả tra
// cứu (findByEmail) lẫn ghi mới (createUser/save).
const findUnique = vi.fn(async () => null);
const create = vi.fn(async ({ data }: any) => ({ id: BigInt(1), ...data }));

vi.mock('@/shared/config/database', () => ({
    prisma: {
        users: {
            findUnique,
            create,
        },
    },
}));

describe('UserRepository — email normalization', () => {
    it('findByEmail lowercases and trims before querying', async () => {
        const { UserRepository } = await import('../UserRepository');
        const repo = new UserRepository();
        await repo.findByEmail('  Foo@Example.COM  ');
        expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
            where: { email: 'foo@example.com' },
        }));
    });

    it('createUser lowercases the stored email', async () => {
        const { UserRepository } = await import('../UserRepository');
        const repo = new UserRepository();
        await repo.createUser({
            email: 'Foo@Example.COM',
            password_hash: 'hash',
            full_name: 'Foo',
            status: 'INACTIVE' as any,
            role: 'STUDENT' as any,
            created_at: new Date(),
        });
        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ email: 'foo@example.com' }),
        }));
    });

    it('save() lowercases the stored email for a new user', async () => {
        const { UserRepository } = await import('../UserRepository');
        const { UserEntity } = await import('../../domain/UserEntity');
        const repo = new UserRepository();
        const newUser = new UserEntity(
            BigInt(0), 'Foo@Example.COM', 'hash', 'INACTIVE' as any, 'STUDENT' as any, 'Foo',
        );
        await repo.save(newUser);
        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ email: 'foo@example.com' }),
        }));
    });
});
