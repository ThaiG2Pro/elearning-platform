import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * WP1.9 — public showcase seed artifact.
 *
 * Separate on purpose from `prisma/seed.ts` (dev/QA data, truncates every
 * table on every run, owned by test logins like jack@gmail.com). This script
 * is additive/idempotent (upsert by slug) and safe to run against a real
 * database that already has real users and spaces in it — running it twice
 * does not duplicate anything.
 *
 * Content choice: 5 real, popular, free full-space videos (verified via
 * YouTube's oEmbed endpoint before writing this file — titles/authors below
 * are the actual oEmbed response, not invented). These are single long
 * videos, not multi-video YouTube *playlists* — deliberately, because the
 * product's own from-link flow doesn't support playlist URLs yet (see
 * WP1.10.2, which explicitly rejects them at validation); seeding "playlists"
 * the app itself can't create from a real link would be a fake artifact.
 * ROADMAP.md's WP1.9 audit note has the same rationale.
 */
const SHOWCASE_SPACES = [
    {
        slug: 'showcase-java-full-space',
        title: 'Nhập môn Java — Full Space',
        description:
            'Java Full Space for free ☕ — Bro Code. Playlist showcase công khai, dựng từ video full-space thật.',
        videoUrl: 'https://www.youtube.com/watch?v=xTtL8E4LzTQ',
        videoTitle: 'Java Full Space for free ☕',
    },
    {
        slug: 'showcase-cpp-full-space',
        title: 'Nhập môn C++ — Full Space',
        description:
            'C++ Full Space for free ⚡️ — Bro Code. Showcase công khai, dựng từ video full-space thật.',
        videoUrl: 'https://www.youtube.com/watch?v=-TkoO8Z07hI',
        videoTitle: 'C++ Full Space for free ⚡️',
    },
    {
        slug: 'showcase-python-full-space',
        title: 'Nhập môn Python — Full Space',
        description:
            'Learn Python - Full Space for Beginners [Tutorial] — freeCodeCamp.org. Showcase công khai.',
        videoUrl: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
        videoTitle: 'Learn Python - Full Space for Beginners [Tutorial]',
    },
    {
        slug: 'showcase-javascript-full-space',
        title: 'Nhập môn JavaScript — Full Space',
        description: 'JavaScript Programming - Full Space — freeCodeCamp.org. Showcase công khai.',
        videoUrl: 'https://www.youtube.com/watch?v=jS4aFq5-91M',
        videoTitle: 'JavaScript Programming - Full Space',
    },
    {
        slug: 'showcase-html-css-full-space',
        title: 'Nhập môn HTML & CSS — Full Space',
        description:
            'Learn HTML5 and CSS3 From Scratch - Full Space — freeCodeCamp.org. Showcase công khai.',
        videoUrl: 'https://www.youtube.com/watch?v=mU6anWqZJcc',
        videoTitle: 'Learn HTML5 and CSS3 From Scratch - Full Space',
    },
];

/** Mirrors SpaceRepository.ensureShareToken — opaque, not the numeric id. */
function generateShareToken(): string {
    return randomBytes(10).toString('base64url');
}

/**
 * Mirrors YouTubeOEmbedAdapter.normalize — same plain copy as prisma/seed.ts,
 * for the same reason (ts-node seed runner can't resolve extension-less src/
 * imports).
 */
const YOUTUBE_ID_PATTERN = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
function normalizeYouTubeUrl(url: string): string {
    const match = url.match(YOUTUBE_ID_PATTERN);
    if (!match) return url.trim();
    return `https://www.youtube.com/watch?v=${match[1]}`;
}

async function upsertVideoSource(url: string, title: string) {
    const normalizedUrl = normalizeYouTubeUrl(url);
    // WP1.10.1 — standardized sources.type value (was 'VIDEO' here, mismatched
    // with the service's 'YOUTUBE'; both now write 'YOUTUBE_VIDEO').
    return prisma.sources.upsert({
        where: { normalized_url: normalizedUrl },
        update: {},
        create: { url, normalized_url: normalizedUrl, title, type: 'YOUTUBE_VIDEO' },
    });
}

async function main() {
    console.log('🌱 Seeding public showcase artifact (WP1.9)...');

    // Dedicated showcase account — deliberately not one of seed.ts's test
    // logins (jack@gmail.com etc.). Nobody is meant to log in as this user;
    // it exists only so showcase spaces have a stable, clearly-labelled
    // owner distinct from real users and from dev/test data.
    const showcaseEmail = 'showcase@elearning-platform.local';
    let showcaseOwner = await prisma.users.findFirst({ where: { email: showcaseEmail } });
    if (!showcaseOwner) {
        const hashedPassword = await bcrypt.hash(randomBytes(32).toString('base64url'), 10);
        showcaseOwner = await prisma.users.create({
            data: {
                email: showcaseEmail,
                password_hash: hashedPassword,
                full_name: 'E-Learning Showcase',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date(),
            },
        });
        console.log(`✅ Created dedicated showcase owner (${showcaseEmail})`);
    }

    for (const item of SHOWCASE_SPACES) {
        const existing = await prisma.spaces.findUnique({ where: { slug: item.slug } });
        if (existing) {
            // Idempotent: make sure the flag survives even if the row was
            // created before is_showcase existed, but don't touch content.
            if (!existing.is_showcase) {
                await prisma.spaces.update({
                    where: { id: existing.id },
                    data: { is_showcase: true },
                });
            }
            console.log(`↩︎  ${item.slug} already exists — skipped`);
            continue;
        }

        const source = await upsertVideoSource(item.videoUrl, item.videoTitle);

        const space = await prisma.spaces.create({
            data: {
                owner_id: showcaseOwner.id,
                title: item.title,
                slug: item.slug,
                description: item.description,
                status: 'ACTIVE',
                share_token: generateShareToken(),
                is_showcase: true,
                // WP1.10.1 — space sinh từ nguồn nào, cùng ngữ nghĩa với
                // from-link flow thật.
                source_id: source.id,
            },
        });

        const chapter = await prisma.chapters.create({
            data: { space_id: space.id, title: item.videoTitle, order_index: 1 },
        });

        await prisma.lessons.create({
            data: {
                chapter_id: chapter.id,
                source_id: source.id,
                title: item.videoTitle,
                type: 'VIDEO',
                content_url: item.videoUrl,
                order_index: 1,
            },
        });

        console.log(`✅ Created showcase space: ${item.title}`);
    }

    console.log('🎉 Showcase seed complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
