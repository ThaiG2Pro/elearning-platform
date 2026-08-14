import { describe, it, expect } from 'vitest';
import { RecipeHash } from '../RecipeHash';

describe('RecipeHash.compute', () => {
    const base = {
        type: 'summary',
        params: { length: 'standard', language: 'vi' },
        segmentRange: null,
        modelVersion: 'gemini-2.5-flash',
    };

    it('is stable regardless of key order in params', () => {
        const a = RecipeHash.compute(base);
        const b = RecipeHash.compute({
            ...base,
            params: { language: 'vi', length: 'standard' },
        });
        expect(a).toBe(b);
    });

    it('changes when any param changes', () => {
        const a = RecipeHash.compute(base);
        const b = RecipeHash.compute({ ...base, params: { ...base.params, length: 'long' } });
        expect(a).not.toBe(b);
    });

    it('changes when segmentRange changes — even a segment-only edit must bust cache', () => {
        const a = RecipeHash.compute(base);
        const b = RecipeHash.compute({ ...base, segmentRange: { startSec: 0, endSec: 120 } });
        expect(a).not.toBe(b);
    });

    it('changes when modelVersion changes — upgrading the model must bust SHARED_FREE cache', () => {
        const a = RecipeHash.compute(base);
        const b = RecipeHash.compute({ ...base, modelVersion: 'gemini-3.0-flash' });
        expect(a).not.toBe(b);
    });

    it('changes when type changes', () => {
        const a = RecipeHash.compute(base);
        const b = RecipeHash.compute({ ...base, type: 'quiz' });
        expect(a).not.toBe(b);
    });
});
