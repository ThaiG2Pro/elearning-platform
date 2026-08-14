import { describe, it, expect } from 'vitest';
import { AIGenerationPolicy } from '../AIGenerationPolicy';

describe('AIGenerationPolicy.decideRouting — 4 nhánh cố định (economics doc mục 4)', () => {
    it('BYOK key present → always generates via BYOK, regardless of cache state', () => {
        const decision = AIGenerationPolicy.decideRouting({
            hasByokKey: true,
            isDefaultRecipe: false,
            hasDefaultCache: true,
            hasSharedByokMatch: true,
        });
        expect(decision).toEqual({ action: 'GENERATE', keySource: 'BYOK' });
    });

    it('no key, default recipe, cache hit → serves cache instantly, free', () => {
        const decision = AIGenerationPolicy.decideRouting({
            hasByokKey: false,
            isDefaultRecipe: true,
            hasDefaultCache: true,
            hasSharedByokMatch: false,
        });
        expect(decision).toEqual({ action: 'USE_CACHE', keySource: 'SHARED_FREE' });
    });

    it('no key, default recipe, cache miss → generates once via SHARED_FREE', () => {
        const decision = AIGenerationPolicy.decideRouting({
            hasByokKey: false,
            isDefaultRecipe: true,
            hasDefaultCache: false,
            hasSharedByokMatch: false,
        });
        expect(decision).toEqual({ action: 'GENERATE', keySource: 'SHARED_FREE' });
    });

    it('no key, custom recipe, matching SHARED-BYOK bản exists → reuses it free', () => {
        const decision = AIGenerationPolicy.decideRouting({
            hasByokKey: false,
            isDefaultRecipe: false,
            hasDefaultCache: false,
            hasSharedByokMatch: true,
        });
        expect(decision).toEqual({ action: 'USE_CACHE', keySource: 'BYOK' });
    });

    it('no key, custom recipe, no SHARED-BYOK match → blocked, must choose BYOK or paid', () => {
        const decision = AIGenerationPolicy.decideRouting({
            hasByokKey: false,
            isDefaultRecipe: false,
            hasDefaultCache: false,
            hasSharedByokMatch: false,
        });
        expect(decision).toEqual({ action: 'CHOICE_REQUIRED' });
    });
});

describe('AIGenerationPolicy.resolveVisibility — free-rider fix (mục 5)', () => {
    it('PAID_TIER is always forced PRIVATE, even if the user asks for SHARED', () => {
        expect(AIGenerationPolicy.resolveVisibility('PAID_TIER', true)).toBe('PRIVATE');
    });

    it('SHARED_FREE is always SHARED by definition', () => {
        expect(AIGenerationPolicy.resolveVisibility('SHARED_FREE', false)).toBe('SHARED');
    });

    it('BYOK respects the user\'s explicit choice', () => {
        expect(AIGenerationPolicy.resolveVisibility('BYOK', true)).toBe('SHARED');
        expect(AIGenerationPolicy.resolveVisibility('BYOK', false)).toBe('PRIVATE');
    });
});

describe('AIGenerationPolicy.isDefaultRecipe — ranh giới cứng (mục 2)', () => {
    const defaults = { length: 'standard', difficulty: 'medium', language: 'vi' };

    it('matches when params equal defaults and no segment set', () => {
        expect(AIGenerationPolicy.isDefaultRecipe({ ...defaults }, null, defaults)).toBe(true);
    });

    it('rejects when a single param differs from defaults', () => {
        expect(
            AIGenerationPolicy.isDefaultRecipe({ ...defaults, difficulty: 'hard' }, null, defaults),
        ).toBe(false);
    });

    it('rejects when segmentRange is set — even a segment-only customization leaves "default"', () => {
        expect(
            AIGenerationPolicy.isDefaultRecipe({ ...defaults }, { startSec: 0, endSec: 60 }, defaults),
        ).toBe(false);
    });
});

describe('AIGenerationPolicy.inheritOnClone — hệ quả mục 5', () => {
    it('does not inherit a PAID_TIER-sourced generation on clone', () => {
        expect(AIGenerationPolicy.inheritOnClone('PAID_TIER')).toBe(false);
    });

    it('inherits SHARED_FREE and BYOK-sourced generations on clone', () => {
        expect(AIGenerationPolicy.inheritOnClone('SHARED_FREE')).toBe(true);
        expect(AIGenerationPolicy.inheritOnClone('BYOK')).toBe(true);
    });

    it('has nothing to inherit when there is no generation at all', () => {
        expect(AIGenerationPolicy.inheritOnClone(null)).toBe(false);
    });
});

describe('AIGenerationPolicy.enforceDailyActivationLimit — cost-DoS guard (mục 6.1)', () => {
    it('allows activation under the daily limit', () => {
        expect(() => AIGenerationPolicy.enforceDailyActivationLimit(4, 5)).not.toThrow();
    });

    it('blocks activation once the daily limit is reached', () => {
        expect(() => AIGenerationPolicy.enforceDailyActivationLimit(5, 5)).toThrow(
            'AI_DAILY_RATE_LIMIT_EXCEEDED',
        );
    });
});

describe('AIGenerationPolicy.enforceSharedFreeTokenBudget — quota theo chi phí thực (mục 6.3)', () => {
    it('allows a Source within the SHARED_FREE token budget', () => {
        expect(() => AIGenerationPolicy.enforceSharedFreeTokenBudget(5000, 20000)).not.toThrow();
    });

    it('rejects a Source whose estimated transcript cost exceeds the SHARED_FREE budget', () => {
        expect(() => AIGenerationPolicy.enforceSharedFreeTokenBudget(50000, 20000)).toThrow(
            'SOURCE_TOO_LONG_FOR_SHARED_FREE',
        );
    });
});
