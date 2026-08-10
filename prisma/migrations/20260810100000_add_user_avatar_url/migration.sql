-- WP1.5.6: real avatar support (stored as a data: URL, resized client-side
-- before upload — see users.avatar_url comment in schema.prisma).
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
