import { prisma } from '../../../shared/config/database';
import { RoleEntity } from '../domain/RoleEntity';

export class RoleRepository {
    async findById(id: number): Promise<RoleEntity | null> {
        const role = await prisma.roles.findUnique({
            where: { id },
        });
        if (!role) return null;
        return new RoleEntity(role.id, role.name);
    }

    async findAll(): Promise<RoleEntity[]> {
        const roles = await prisma.roles.findMany({
            orderBy: { id: 'asc' },
        });
        return roles.map(role => new RoleEntity(role.id, role.name));
    }

    async findByName(name: string): Promise<RoleEntity | null> {
        const role = await prisma.roles.findFirst({
            where: { name },
        });
        if (!role) return null;
        return new RoleEntity(role.id, role.name);
    }
}
