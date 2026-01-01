import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Converting REJECTED courses to DRAFT and preserving reject_note...');
    const result = await prisma.courses.updateMany({
        where: { status: 'REJECTED' },
        data: { status: 'DRAFT' }
    });
    console.log(`Updated ${result.count} course(s)`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
