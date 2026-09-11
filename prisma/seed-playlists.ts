import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Bulk-launch content seed — bootstrap real, multi-lesson spaces from real
 * YouTube playlists so the first users have something to browse instead of
 * waiting for organic contributions.
 *
 * Deliberately separate from prisma/seed-showcase.ts: that script seeds 5
 * single-video demo spaces and explicitly avoids playlists (its own comment:
 * "seeding 'playlists' the app itself can't create from a real link would be
 * a fake artifact") because the from-link UI flow rejects playlist URLs
 * (WP1.10.2 — YouTubeOEmbedAdapter.isPlaylistUrl). This script sidesteps that
 * gap honestly: it does NOT fake a "1 playlist URL = 1 space" import. It
 * calls the real YouTube Data API to enumerate every video in the playlist
 * and creates one real lesson per video — structurally identical to what a
 * user gets by manually adding many video lessons into one space. Nothing
 * here misrepresents what the product can do.
 *
 * Additive/idempotent (upsert by slug, like seed-showcase.ts) — safe to run
 * against a real database, safe to re-run (existing spaces are left alone,
 * not re-synced — re-running does not pick up videos added to a playlist
 * after the first run; delete the space first if you want a full refresh).
 *
 * Requires YOUTUBE_API_KEY (YouTube Data API v3 — oEmbed alone can't list a
 * playlist's videos).
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const DATA_FILE = process.env.PLAYLISTS_SEED_FILE
    ?? path.join(__dirname, 'playlists-seed-data.json');
const SEED_OWNER_EMAIL = 'content-seed@elearning-platform.local';
const MAX_VIDEOS_PER_PLAYLIST = 300; // sanity cap — avoids one pathological playlist blowing up a run
const MIN_VALID_VIDEOS = 3; // fewer than this and the playlist isn't worth a space

interface PlaylistSeedEntry {
    playlistUrl: string;
    slug?: string;
    title?: string;
    description?: string;
}

interface YouTubePlaylistSnippet {
    title: string;
    description: string;
    channelTitle: string;
}

interface YouTubePlaylistItem {
    videoId: string;
    title: string;
}

/** Mirrors SpaceRepository.ensureShareToken — opaque, not the numeric id. */
function generateShareToken(): string {
    return randomBytes(10).toString('base64url');
}

/** Mirrors YouTubeOEmbedAdapter.normalize — same plain copy as the other seed scripts. */
const YOUTUBE_ID_PATTERN = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
function normalizeYouTubeUrl(url: string): string {
    const match = url.match(YOUTUBE_ID_PATTERN);
    if (!match) return url.trim();
    return `https://www.youtube.com/watch?v=${match[1]}`;
}

/** Mirrors prisma/seed.ts's slugify — bỏ dấu tiếng Việt + rút gọn thành slug an toàn cho URL. */
function slugify(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function extractPlaylistId(url: string): string | null {
    const match = url.match(/[?&]list=([^&]+)/);
    return match ? match[1] : null;
}

async function fetchPlaylistSnippet(playlistId: string): Promise<YouTubePlaylistSnippet | null> {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
        params: { part: 'snippet', id: playlistId, key: YOUTUBE_API_KEY },
    });
    const item = response.data.items?.[0];
    if (!item) return null;
    return {
        title: item.snippet.title,
        description: item.snippet.description ?? '',
        channelTitle: item.snippet.channelTitle,
    };
}

/** Paginates playlistItems.list, filtering out private/deleted entries. */
async function fetchPlaylistVideos(playlistId: string): Promise<YouTubePlaylistItem[]> {
    const videos: YouTubePlaylistItem[] = [];
    let pageToken: string | undefined;

    do {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
            params: {
                part: 'snippet,contentDetails',
                playlistId,
                maxResults: 50,
                pageToken,
                key: YOUTUBE_API_KEY,
            },
        });

        for (const item of response.data.items ?? []) {
            const videoId: string | undefined = item.contentDetails?.videoId;
            const title: string | undefined = item.snippet?.title;
            if (!videoId || !title) continue;
            if (title === 'Private video' || title === 'Deleted video') continue;
            videos.push({ videoId, title });
            if (videos.length >= MAX_VIDEOS_PER_PLAYLIST) return videos;
        }

        pageToken = response.data.nextPageToken;
    } while (pageToken);

    return videos;
}

async function upsertVideoSource(url: string, title: string) {
    const normalizedUrl = normalizeYouTubeUrl(url);
    return prisma.sources.upsert({
        where: { normalized_url: normalizedUrl },
        update: {},
        create: { url, normalized_url: normalizedUrl, title, type: 'YOUTUBE_VIDEO' },
    });
}

async function ensureUniqueSlug(base: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    while (await prisma.spaces.findUnique({ where: { slug: candidate } })) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
    }
    return candidate;
}

async function main() {
    if (!YOUTUBE_API_KEY) {
        console.error('❌ YOUTUBE_API_KEY chưa được cấu hình (cần YouTube Data API v3 để liệt kê video trong playlist).');
        process.exit(1);
    }

    if (!fs.existsSync(DATA_FILE)) {
        console.error(`❌ Không tìm thấy file dữ liệu playlist: ${DATA_FILE}`);
        process.exit(1);
    }

    const entries: PlaylistSeedEntry[] = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    console.log(`🌱 Seeding ${entries.length} playlist(s) từ ${DATA_FILE}...`);

    let seedOwner = await prisma.users.findFirst({ where: { email: SEED_OWNER_EMAIL } });
    if (!seedOwner) {
        const hashedPassword = await bcrypt.hash(randomBytes(32).toString('base64url'), 10);
        seedOwner = await prisma.users.create({
            data: {
                email: SEED_OWNER_EMAIL,
                password_hash: hashedPassword,
                full_name: 'E-Learning Content Seed',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date(),
            },
        });
        console.log(`✅ Created dedicated seed owner (${SEED_OWNER_EMAIL})`);
    }

    const summary = { created: 0, skippedExisting: 0, failed: [] as string[] };

    for (const entry of entries) {
        try {
            const playlistId = extractPlaylistId(entry.playlistUrl);
            if (!playlistId) {
                summary.failed.push(`${entry.playlistUrl} — không tách được playlist id`);
                continue;
            }

            const providedSlug = entry.slug ? slugify(entry.slug) : null;
            if (providedSlug) {
                const existing = await prisma.spaces.findUnique({ where: { slug: providedSlug } });
                if (existing) {
                    console.log(`↩︎  ${providedSlug} đã tồn tại — bỏ qua`);
                    summary.skippedExisting += 1;
                    continue;
                }
            }

            const snippet = await fetchPlaylistSnippet(playlistId);
            if (!snippet) {
                summary.failed.push(`${entry.playlistUrl} — playlist không tồn tại/riêng tư`);
                continue;
            }

            const title = entry.title?.trim() || snippet.title;
            const slug = providedSlug ?? await ensureUniqueSlug(slugify(title));

            // Re-check under the derived slug too, in case no explicit slug was given.
            if (!providedSlug) {
                const existing = await prisma.spaces.findUnique({ where: { slug } });
                if (existing) {
                    console.log(`↩︎  ${slug} đã tồn tại — bỏ qua`);
                    summary.skippedExisting += 1;
                    continue;
                }
            }

            const videos = await fetchPlaylistVideos(playlistId);
            if (videos.length < MIN_VALID_VIDEOS) {
                summary.failed.push(`${entry.playlistUrl} — chỉ có ${videos.length} video hợp lệ (< ${MIN_VALID_VIDEOS})`);
                continue;
            }

            const description = entry.description?.trim()
                || snippet.description.slice(0, 500)
                || `Playlist "${title}" — ${snippet.channelTitle}.`;

            const space = await prisma.spaces.create({
                data: {
                    owner_id: seedOwner.id,
                    title,
                    slug,
                    description,
                    status: 'ACTIVE',
                    share_token: generateShareToken(),
                    is_showcase: true,
                    // Multi-source space (one source per video) — no single space.source_id.
                },
            });

            const chapter = await prisma.chapters.create({
                data: { space_id: space.id, title, order_index: 1 },
            });

            let orderIndex = 1;
            for (const video of videos) {
                const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
                const source = await upsertVideoSource(videoUrl, video.title);
                await prisma.lessons.create({
                    data: {
                        chapter_id: chapter.id,
                        source_id: source.id,
                        title: video.title,
                        type: 'VIDEO',
                        content_url: videoUrl,
                        order_index: orderIndex,
                    },
                });
                orderIndex += 1;
            }

            console.log(`✅ ${slug} — ${videos.length} lesson(s) (${snippet.channelTitle})`);
            summary.created += 1;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            summary.failed.push(`${entry.playlistUrl} — ${message}`);
        }
    }

    console.log('\n🎉 Playlist seed complete.');
    console.log(`   Created: ${summary.created}`);
    console.log(`   Skipped (already existed): ${summary.skippedExisting}`);
    if (summary.failed.length > 0) {
        console.log(`   Failed: ${summary.failed.length}`);
        for (const f of summary.failed) console.log(`     - ${f}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
