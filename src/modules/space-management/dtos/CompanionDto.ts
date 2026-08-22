/**
 * WP1.7 — one member of a space's clone lineage (the owner-authored root
 * plus everyone who cloned it), with their own progress on their own copy.
 * Read-only, visible only to lineage members themselves — not a public
 * leaderboard.
 */
export class CompanionDto {
    constructor(
        public spaceId: number,
        public name: string,
        public completionRate: number,
        public isSelf: boolean,
    ) { }
}
