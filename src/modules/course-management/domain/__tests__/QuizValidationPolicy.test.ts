import { describe, it, expect } from 'vitest';
import { QuizValidationPolicy, ExcelInvalidException } from '../QuizValidationPolicy';

describe('QuizValidationPolicy.validateParsedQuestion', () => {
    it('accepts a well-formed question (text correctAnswer)', () => {
        expect(() =>
            QuizValidationPolicy.validateParsedQuestion(
                { content: 'Thủ đô Việt Nam là gì?', options: ['Hà Nội', 'TP.HCM', 'Đà Nẵng'], correctAnswer: 'Hà Nội' },
                1,
            ),
        ).not.toThrow();
    });

    it('accepts a bare-letter correctAnswer (A-D)', () => {
        expect(() =>
            QuizValidationPolicy.validateParsedQuestion(
                { content: 'Câu hỏi', options: ['A đáp án', 'B đáp án'], correctAnswer: 'A' },
                1,
            ),
        ).not.toThrow();
    });

    it('rejects missing content', () => {
        expect(() =>
            QuizValidationPolicy.validateParsedQuestion({ options: ['A', 'B'], correctAnswer: 'A' }, 3),
        ).toThrow(ExcelInvalidException);
    });

    it('rejects fewer than 2 options', () => {
        expect(() =>
            QuizValidationPolicy.validateParsedQuestion({ content: 'X', options: ['A'], correctAnswer: 'A' }, 3),
        ).toThrow(ExcelInvalidException);
    });

    it('rejects more than 4 options (fixed option_a..d columns)', () => {
        expect(() =>
            QuizValidationPolicy.validateParsedQuestion(
                { content: 'X', options: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 'A' },
                3,
            ),
        ).toThrow(ExcelInvalidException);
    });

    it('rejects a correctAnswer that matches no option', () => {
        expect(() =>
            QuizValidationPolicy.validateParsedQuestion(
                { content: 'X', options: ['Hà Nội', 'TP.HCM'], correctAnswer: 'Đà Nẵng' },
                3,
            ),
        ).toThrow(ExcelInvalidException);
    });
});

describe('QuizValidationPolicy.validateRowStructure (Excel path still works after refactor)', () => {
    it('accepts a pipe-separated valid row', () => {
        expect(() =>
            QuizValidationPolicy.validateRowStructure(
                { Content: 'Câu hỏi', Options: 'A|B|C', CorrectAnswer: 'B' },
                2,
            ),
        ).not.toThrow();
    });

    it('rejects a row whose CorrectAnswer matches no option', () => {
        expect(() =>
            QuizValidationPolicy.validateRowStructure(
                { Content: 'Câu hỏi', Options: 'A|B|C', CorrectAnswer: 'D' },
                2,
            ),
        ).toThrow(ExcelInvalidException);
    });
});
