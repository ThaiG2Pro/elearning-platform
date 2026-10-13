-- AlterTable
ALTER TABLE "spaces" ADD COLUMN     "root_space_id" BIGINT;

-- Backfill existing clones: climb up cloned_from_space_id to find the root space
WITH RECURSIVE lineage_up AS (
    SELECT id AS space_id, id AS ancestor_id, cloned_from_space_id, 0 AS depth
    FROM spaces
    WHERE cloned_from_space_id IS NOT NULL

    UNION ALL

    SELECT lu.space_id, s.id AS ancestor_id, s.cloned_from_space_id, lu.depth + 1
    FROM spaces s
    JOIN lineage_up lu ON s.id = lu.cloned_from_space_id
),
highest_ancestor AS (
    SELECT DISTINCT ON (space_id) space_id, ancestor_id AS root_id
    FROM lineage_up
    ORDER BY space_id, depth DESC
)
UPDATE spaces s
SET root_space_id = ha.root_id
FROM highest_ancestor ha
WHERE s.id = ha.space_id;

-- CreateIndex
CREATE INDEX "spaces_root_space_id_idx" ON "spaces"("root_space_id");

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_root_space_id_fkey" FOREIGN KEY ("root_space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
