-- WP1.6.2: /my-learning is being switched from reading the legacy
-- `enrollments` table (which had its own enrolled_at) to reading owned
-- courses directly — this gives it a real date to display/sort by.
ALTER TABLE "courses" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
