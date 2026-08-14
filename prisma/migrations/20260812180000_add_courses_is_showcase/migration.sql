-- WP1.9 — tags courses seeded as public showcase artifacts (real, popular
-- free YouTube courses, owned by a dedicated showcase account) so they can be
-- told apart from ordinary dev/test seed and user-created courses.
ALTER TABLE "courses" ADD COLUMN "is_showcase" BOOLEAN NOT NULL DEFAULT false;
