import { describe, it, expect } from 'vitest';
import { parseAIQuizContent, AIGenerationError } from '../aiGeneration';

describe('parseAIQuizContent', () => {
    it('parses clean JSON matching the requested schema', () => {
        const raw = JSON.stringify([
            { content: 'Câu 1?', options: ['A', 'B', 'C'], correctAnswer: 'B' },
            { content: 'Câu 2?', options: ['X', 'Y'], correctAnswer: 'X' },
        ]);
        const result = parseAIQuizContent(raw);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ content: 'Câu 1?', options: ['A', 'B', 'C'], correctAnswer: 'B' });
    });

    it('strips a markdown code fence around the JSON array', () => {
        const raw = '```json\n' + JSON.stringify([{ content: 'Q', options: ['A', 'B'], correctAnswer: 'A' }]) + '\n```';
        expect(parseAIQuizContent(raw)).toHaveLength(1);
    });

    it('extracts the array even if the model added prose around it', () => {
        const raw = `Dưới đây là quiz:\n${JSON.stringify([{ content: 'Q', options: ['A', 'B'], correctAnswer: 'A' }])}\nChúc bạn học tốt!`;
        expect(parseAIQuizContent(raw)).toHaveLength(1);
    });

    it('normalizes alternate field names (question/answer/choices, numeric correct index)', () => {
        const raw = JSON.stringify([{ question: 'Q', choices: ['A', 'B', 'C'], answer: 1 }]);
        const result = parseAIQuizContent(raw);
        expect(result).toEqual([{ content: 'Q', options: ['A', 'B', 'C'], correctAnswer: 'B' }]);
    });

    it('drops individual malformed entries but keeps the valid ones', () => {
        const raw = JSON.stringify([
            { content: 'Valid', options: ['A', 'B'], correctAnswer: 'A' },
            { content: '', options: ['A', 'B'], correctAnswer: 'A' }, // missing content
            { content: 'Too few options', options: ['A'], correctAnswer: 'A' },
        ]);
        expect(parseAIQuizContent(raw)).toEqual([{ content: 'Valid', options: ['A', 'B'], correctAnswer: 'A' }]);
    });

    it('throws AIGenerationError when nothing parseable is found', () => {
        expect(() => parseAIQuizContent('không phải JSON gì cả')).toThrow(AIGenerationError);
    });

    it('throws AIGenerationError when every entry is malformed', () => {
        const raw = JSON.stringify([{ content: '', options: [], correctAnswer: '' }]);
        expect(() => parseAIQuizContent(raw)).toThrow(AIGenerationError);
    });
});
