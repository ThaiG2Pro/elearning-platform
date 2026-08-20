import { describe, it, expect } from 'vitest';
import { DataRetentionPolicy } from '../DataRetentionPolicy';

const NOW = new Date('2026-08-18T00:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe('DataRetentionPolicy.isEligibleForArchive — mục 6.4', () => {
    it('never archives while a public course still references the Source', () => {
        expect(
            DataRetentionPolicy.isEligibleForArchive({
                lastAccessedAt: daysAgo(400),
                createdAt: daysAgo(400),
                hasPublicCourseReference: true,
                now: NOW,
                thresholdDays: 180,
            }),
        ).toBe(false);
    });

    it('archives a Source last accessed well past the threshold with no public reference', () => {
        expect(
            DataRetentionPolicy.isEligibleForArchive({
                lastAccessedAt: daysAgo(200),
                createdAt: daysAgo(400),
                hasPublicCourseReference: false,
                now: NOW,
                thresholdDays: 180,
            }),
        ).toBe(true);
    });

    it('does not archive a Source accessed recently, even if created long ago', () => {
        expect(
            DataRetentionPolicy.isEligibleForArchive({
                lastAccessedAt: daysAgo(5),
                createdAt: daysAgo(400),
                hasPublicCourseReference: false,
                now: NOW,
                thresholdDays: 180,
            }),
        ).toBe(false);
    });

    it('falls back to createdAt when last_accessed_at was never set', () => {
        expect(
            DataRetentionPolicy.isEligibleForArchive({
                lastAccessedAt: null,
                createdAt: daysAgo(200),
                hasPublicCourseReference: false,
                now: NOW,
                thresholdDays: 180,
            }),
        ).toBe(true);
    });

    it('is exactly-at-threshold inclusive', () => {
        expect(
            DataRetentionPolicy.isEligibleForArchive({
                lastAccessedAt: daysAgo(180),
                createdAt: null,
                hasPublicCourseReference: false,
                now: NOW,
                thresholdDays: 180,
            }),
        ).toBe(true);
    });

    it('does not archive when there is no timestamp at all to compare against', () => {
        expect(
            DataRetentionPolicy.isEligibleForArchive({
                lastAccessedAt: null,
                createdAt: null,
                hasPublicCourseReference: false,
                now: NOW,
                thresholdDays: 180,
            }),
        ).toBe(false);
    });
});
