# CLEAN ARCHITECTURE & DDD REFACTORING PLAN

## Executive Summary

This document outlines a 6-phase refactoring plan to transform the Next.js LMS monolith from a loosely-structured codebase into a Clean Architecture/DDD-aligned system. The goal is to create a modular, testable foundation suitable for future microservice decomposition.

**Current State:** Architecture violates Clean Architecture principles in 3 key areas:
1. Infrastructure leakage (Prisma) into domain and controller layers
2. Business logic scattered in controllers instead of service layer
3. Weak typing and missing application layer

**Target State:** 
- Domain layer free from infrastructure dependencies
- Clear separation: Domain → Application → Controller
- Strong typing throughout
- Dependency inversion via interfaces
- Event-driven cross-context communication

---

## 1. ARCHITECTURE VIOLATION CATALOG

### 1.1 Prisma Leakage into Domain Layer

**File:** `src/modules/auth/domain/UserFactory.ts`
**Lines:** 3, 17-22
**Severity:** CRITICAL
**Impact:** Domain cannot be tested without database connection

**Current Code:**
```typescript
// Line 3: VIOLATION - Infrastructure in domain
import { PrismaClient } from '@prisma/client';

class UserFactory {
  static create(userData: CreateUserInput) {
    // Lines 17-22: VIOLATION - Direct ORM calls
    const user = prisma.user.findUnique({
      where: { email: userData.email }
    });
    // ...
  }
}
```

**After Refactor:**
```typescript
// No Prisma import
import { IRoleRepository } from '../repositories/IRoleRepository';

class UserFactory {
  constructor(private roleRepository: IRoleRepository) {}
  
  static async create(userData: CreateUserInput, roleData: Role) {
    const user = new User(userData.id, userData.email, userData.name);
    user.assignRole(roleData);
    return user;
  }
}
```

---

### 1.2 Prisma Leakage into Controller Layer

**File:** `src/modules/course-management/controllers/QuizController.ts`
**Lines:** 8, 25-29
**Severity:** CRITICAL
**Impact:** Controller creates infrastructure dependencies; violates single responsibility

**Current Code:**
```typescript
// Line 8: VIOLATION - Infrastructure in controller
import { PrismaClient } from '@prisma/client';

export class QuizController {
  // Lines 25-29: VIOLATION - Repository instantiation in controller
  const prisma = new PrismaClient();
  const quizRepository = new QuizRepository(prisma);
  const quizService = new QuizService(quizRepository);
  
  async getQuestion(req: NextApiRequest, res: NextApiResponse) {
    // ...
  }
}
```

**After Refactor:**
```typescript
// No Prisma import - only depends on services and types

export class QuizController {
  constructor(private quizService: IQuizService) {}
  
  async getQuestion(req: NextApiRequest, res: NextApiResponse) {
    const questionId = req.query.id as string;
    const result = await this.quizService.getQuestion(questionId);
    res.status(200).json(result);
  }
}
```

---

### 1.3 Business Logic in Controllers

**File:** `src/modules/course-management/controllers/QuizController.ts`
**Lines:** 84-93, 104-114
**Severity:** CRITICAL (2 violations)
**Impact:** Logic duplication; controller responsible for domain concerns

**Current Code (Lines 84-93):**
```typescript
// VIOLATION - Answer format conversion in controller
const answerIndex = parseInt(submission.selected_option.replace('option_', ''));
const answer = {
  questionId: submission.question_id,
  selectedIndex: answerIndex,
  timestamp: new Date(submission.created_at)
};
```

**Current Code (Lines 104-114):**
```typescript
// VIOLATION - Score calculation logic in controller
const score = correctAnswers.length / totalQuestions * 100;
const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : 'C';
const results = {
  score,
  grade,
  passedQuiz: score >= 60
};
```

**After Refactor:**
```typescript
// Application/Use Case layer (src/modules/quiz/application/SubmitQuizUseCase.ts)
export class SubmitQuizUseCase {
  async execute(command: SubmitQuizCommand): Promise<QuizResultDto> {
    // All business logic here
    const normalizedAnswers = AnswerNormalizer.normalize(command.answers);
    const result = await this.quizGradingPolicy.evaluate(normalizedAnswers);
    return QuizResultMapper.toDomain(result);
  }
}

// Controller only delegates
async submitQuiz(req: NextApiRequest, res: NextApiResponse) {
  const useCase = new SubmitQuizUseCase(...);
  const result = await useCase.execute(req.body);
  res.status(200).json(result);
}
```

---

### 1.4 Response Transformation in Controllers

**File:** `src/modules/course-management/controllers/QuizController.ts`
**Lines:** 44-74, 120-130
**Severity:** HIGH
**Impact:** Data mapping belongs in service/mapper layer; controllers bloated

**Current Code (Lines 44-74):**
```typescript
// VIOLATION - Data transformation in controller
const displayQuestions = questions.map(q => ({
  id: q.id,
  text: q.question_text.trim().replace(/\n+/g, ' '),
  type: q.question_type === 'single' ? 'single_choice' : 'multiple_choice',
  options: q.options.map((opt, idx) => ({
    index: idx,
    label: `option_${idx}`,
    text: opt.replace(/\s+/g, ' '),
    isCorrect: q.correct_answers.includes(idx)
  }))
}));
```

**After Refactor:**
```typescript
// Application/Mapper layer (src/modules/quiz/application/QuestionDisplayMapper.ts)
export class QuestionDisplayMapper {
  static toDisplayDto(question: Question): QuestionDisplayDto {
    return {
      id: question.id,
      text: question.normalizeText(),
      type: question.type,
      options: question.options.map((opt, idx) => ({
        index: idx,
        label: `option_${idx}`,
        text: opt.normalize(),
        isCorrect: question.isCorrectAnswer(idx)
      }))
    };
  }
}

// Service uses mapper
getQuestions(): QuestionDisplayDto[] {
  return this.questions.map(q => QuestionDisplayMapper.toDisplayDto(q));
}

// Controller simply delegates
async getQuestion(req: NextApiRequest, res: NextApiResponse) {
  const dto = await this.quizService.getQuestion(req.query.id);
  res.status(200).json(dto);
}
```

---

### 1.5 Service Instantiation in Controllers

**File:** `src/modules/auth/controllers/AuthController.ts`
**Lines:** 25-29
**Severity:** MEDIUM
**Impact:** Violates DI principle; controller knows about transitive dependencies

**Current Code:**
```typescript
export class AuthController {
  async register(req: NextApiRequest, res: NextApiResponse) {
    // Lines 25-29: VIOLATION - Manual instantiation
    const userRepository = new UserRepository();
    const tokenService = new TokenService();
    const authService = new AuthService(userRepository, tokenService);
    
    const result = await authService.register(req.body);
    res.status(200).json(result);
  }
}
```

**After Refactor:**
```typescript
export class AuthController {
  constructor(private authService: IAuthService) {}
  
  async register(req: NextApiRequest, res: NextApiResponse) {
    const result = await this.authService.register(req.body);
    res.status(200).json(result);
  }
}

// Composition root (src/lib/di/CompositionRoot.ts)
const container = {
  authService: new AuthService(
    userRepository,
    tokenService
  )
};
```

---

### 1.6 Weak Typing with `any`

**File:** `src/modules/course-management/services/CourseService.ts`
**Lines:** 37-38
**Severity:** MEDIUM
**Impact:** Loss of type safety; harder to catch runtime errors

**Current Code:**
```typescript
// Lines 37-38: VIOLATION - `any` type
mapChapters(chapters: any[]): ChapterDto[] {
  return chapters.map(ch => ({ 
    id: ch.id, 
    title: ch.title 
  }));
}
```

**File:** `src/modules/course-management/domain/PublishingPolicy.ts`
**Lines:** 4
**Severity:** MEDIUM
**Impact:** Domain logic not type-safe

**Current Code:**
```typescript
// Line 4: VIOLATION - `any` type parameter
export function validatePublish(course: any): ValidationResult {
  if (!course.title || course.title.length < 5) {
    return { valid: false, errors: ['Title too short'] };
  }
}
```

**After Refactor:**
```typescript
// Strong typing with domain entities
import { Chapter } from '../domain/Chapter';
import { Course } from '../domain/Course';

mapChapters(chapters: Chapter[]): ChapterDto[] {
  return chapters.map(ch => ({ 
    id: ch.id, 
    title: ch.title 
  }));
}

// Domain policy with proper types
export function validatePublish(course: Course): ValidationResult {
  if (!course.title || course.title.length < 5) {
    return { valid: false, errors: ['Title too short'] };
  }
}
```

---

## 2. REFACTORING PHASES

### Phase 1: Domain Layer Cleanup (Est. 2-4 hours)

**Objective:** Remove infrastructure dependencies from domain; enable unit testing without DB

**Tasks:**
1. Remove Prisma import from `UserFactory.ts` line 3
2. Update `UserFactory.create()` (lines 17-22) to accept role data as parameter
3. Create `IRoleRepository` interface in `src/modules/auth/domain/repositories/`
4. Update `AuthService` to pass role data to factory
5. Write unit tests for `UserFactory` with mocked role data
6. Verify `AuthService` tests mock repository correctly

**Files Modified:**
- `src/modules/auth/domain/UserFactory.ts`
- `src/modules/auth/services/AuthService.ts`
- `src/modules/auth/domain/repositories/IRoleRepository.ts` (new)
- `src/modules/auth/domain/__tests__/UserFactory.test.ts` (new)

**Success Criteria:**
- [ ] Zero Prisma imports in domain layer
- [ ] UserFactory tests run without database connection
- [ ] All existing AuthService tests pass

---

### Phase 2: Repository Layer Abstraction (Est. 4-6 hours)

**Objective:** Define repository interfaces; enable dependency injection

**Tasks:**
1. Create base `IRepository<T>` interface in `src/lib/architecture/repositories/`
2. Define context-specific interfaces:
   - `IUserRepository`
   - `ITokenRepository`
   - `IQuizRepository`
   - `IQuestionRepository`
   - `ICourseRepository`
   - `IEnrollmentRepository`
3. Update all repository implementations to implement these interfaces
4. Remove all Prisma imports from controllers
5. Update services to depend on interfaces only
6. Verify existing tests still pass (may need to update mocks)

**Files Modified/Created:**
- `src/lib/architecture/repositories/IRepository.ts` (new)
- `src/modules/auth/repositories/IUserRepository.ts` (new)
- `src/modules/auth/repositories/ITokenRepository.ts` (new)
- `src/modules/quiz/repositories/IQuizRepository.ts` (new)
- All repository implementations updated
- All controller files updated

**Success Criteria:**
- [ ] All repositories implement interfaces
- [ ] Zero Prisma imports in controllers
- [ ] All service unit tests pass with mocked repositories
- [ ] No `any` type in repository signatures

---

### Phase 3: Controller Cleanup (Est. 3-5 hours)

**Objective:** Move business logic from controllers to services; keep controllers simple

**Tasks:**
1. Create `QuizAnswerNormalizer` value object (move lines 84-93 logic)
2. Create `QuizGradingPolicy` service (move lines 104-114 logic)
3. Create `QuestionDisplayMapper` service (move lines 44-74 logic)
4. Update `QuizController` to use these services
5. Remove Prisma import from `QuizController` line 8
6. Reduce `QuizController` to <30 lines of code
7. Apply same pattern to `AuthController` and other controllers
8. Update controller tests to mock services

**Files Modified/Created:**
- `src/modules/quiz/domain/QuizAnswerNormalizer.ts` (new)
- `src/modules/quiz/domain/QuizGradingPolicy.ts` (new)
- `src/modules/quiz/application/QuestionDisplayMapper.ts` (new)
- `src/modules/quiz/controllers/QuizController.ts` (refactored)
- `src/modules/auth/controllers/AuthController.ts` (refactored)

**Success Criteria:**
- [ ] All controllers <30 lines of code
- [ ] All business logic moved to domain/application/service layers
- [ ] Controller tests pass (mocking services)
- [ ] API contracts unchanged (same endpoints, DTOs, error codes)

---

### Phase 4: Application/UseCase Layer (Est. 5-8 hours)

**Objective:** Create orchestration layer; define transaction boundaries

**Tasks:**
1. Create `ApplicationService` base class with transaction management:
   ```typescript
   export abstract class ApplicationService<T extends CommandOrQuery, R> {
     abstract execute(command: T): Promise<R>;
     protected async executeInTransaction<K>(
       work: () => Promise<K>
     ): Promise<K> {
       // Wrap in Prisma transaction
     }
   }
   ```

2. Define per-context use cases:
   - `src/modules/auth/application/RegisterUserUseCase.ts`
   - `src/modules/course-management/application/PublishCourseUseCase.ts`
   - `src/modules/quiz/application/SubmitQuizUseCase.ts`
   - `src/modules/enrollment/application/EnrollStudentUseCase.ts`

3. Move all service orchestration into use cases
4. Define `UseCaseResult<T>` for consistent response handling
5. Create `DomainEventPublisher` for event emission
6. Update services to emit domain events after successful operations

**Files Created:**
- `src/lib/architecture/application/ApplicationService.ts` (new)
- `src/lib/architecture/application/UseCaseResult.ts` (new)
- `src/lib/architecture/events/DomainEventPublisher.ts` (new)
- Per-context use cases (7+ new files)

**Success Criteria:**
- [ ] All use cases extend ApplicationService
- [ ] All write operations wrapped in transactions
- [ ] Domain events published on successful operations
- [ ] Use case tests mock repositories and event publisher

---

### Phase 5: DI Container & Composition Root (Est. 4-6 hours)

**Objective:** Centralize dependency management; enable clean controller instantiation

**Tasks:**
1. Implement IoC container (option A: manual factory, option B: InversifyJS library)
2. Register all dependencies in `CompositionRoot.ts`:
   ```typescript
   const container = {
     // Repositories
     userRepository: new UserRepository(prisma),
     tokenRepository: new TokenRepository(prisma),
     
     // Services
     authService: new AuthService(
       container.userRepository,
       container.tokenRepository
     ),
     
     // Use Cases
     registerUserUseCase: new RegisterUserUseCase(
       container.authService,
       container.eventPublisher
     ),
     
     // Controllers
     authController: new AuthController(container.authService)
   };
   ```

3. Update all route files to resolve controllers from container
4. Create factory function for controller instantiation
5. Update integration test setup to use container

**Files Created/Modified:**
- `src/lib/di/CompositionRoot.ts` (new or expanded)
- `src/lib/di/Container.ts` (new)
- All API route files updated
- Integration test setup updated

**Success Criteria:**
- [ ] All dependencies registered in container
- [ ] No manual instantiation in controllers or routes
- [ ] Integration tests pass with container setup
- [ ] All dependencies follow constructor injection pattern

---

### Phase 6: Strong Typing & Type Safety (Est. 2-3 hours)

**Objective:** Remove `any` types; enable TypeScript strict mode

**Tasks:**
1. Replace `any` in `CourseService.ts` lines 37-38:
   ```typescript
   // Before
   mapChapters(chapters: any[]): ChapterDto[]
   
   // After
   mapChapters(chapters: Chapter[]): ChapterDto[]
   ```

2. Replace `any` in `PublishingPolicy.ts` line 4:
   ```typescript
   // Before
   export function validatePublish(course: any): ValidationResult
   
   // After
   export function validatePublish(course: Course): ValidationResult
   ```

3. Enable TypeScript strict mode in `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true,
       "strictPropertyInitialization": true
     }
   }
   ```

4. Run TypeScript compiler; fix remaining violations
5. Update all function signatures with proper types
6. Verify all tests pass with strict type checking

**Files Modified:**
- `tsconfig.json` (strict mode enabled)
- `src/modules/course-management/services/CourseService.ts`
- `src/modules/course-management/domain/PublishingPolicy.ts`
- Various files with any-type violations (to be discovered)

**Success Criteria:**
- [ ] Zero `any` types in codebase (except external libraries)
- [ ] TypeScript strict mode enabled and passing
- [ ] All tests pass with strict type checking
- [ ] No type errors on `npm run type-check`

---

## 3. TESTING STRATEGY

### Per-Phase Testing

**Phase 1 - Unit Tests (Domain):**
```typescript
// UserFactory.test.ts
describe('UserFactory', () => {
  it('should create user with role data (no DB)', () => {
    const roleData = { id: '1', name: 'Student' };
    const user = UserFactory.create(
      { id: '1', email: 'user@example.com', name: 'John' },
      roleData
    );
    expect(user.email).toBe('user@example.com');
    expect(user.role.id).toBe('1');
  });
});
```

**Phase 2 - Unit Tests (Repository Interfaces):**
```typescript
// AuthService.test.ts
describe('AuthService', () => {
  it('should use mocked repository (no DB)', () => {
    const mockUserRepo = {
      findByEmail: jest.fn().mockResolvedValue(null)
    };
    const service = new AuthService(mockUserRepo);
    // Test without database
  });
});
```

**Phase 3 - Integration Tests (Controller + Service):**
```typescript
// QuizController.integration.test.ts
describe('QuizController', () => {
  it('should submit quiz and return score', async () => {
    const controller = new QuizController(mockQuizService);
    const result = await controller.submitQuiz(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      score: expect.any(Number)
    }));
  });
});
```

**Phase 4 - UseCase Tests (Transaction Handling):**
```typescript
// SubmitQuizUseCase.test.ts
describe('SubmitQuizUseCase', () => {
  it('should execute in transaction', async () => {
    const useCase = new SubmitQuizUseCase(
      mockQuizService,
      mockEventPublisher,
      mockTxnManager
    );
    await useCase.execute(command);
    expect(mockTxnManager.commit).toHaveBeenCalled();
  });
});
```

**Phase 5 - Container Tests:**
```typescript
// CompositionRoot.test.ts
describe('CompositionRoot', () => {
  it('should resolve all dependencies', () => {
    const container = new CompositionRoot();
    expect(container.authController).toBeDefined();
    expect(container.authController.authService).toBeDefined();
  });
});
```

**Phase 6 - Full E2E Tests:**
```bash
# All existing e2e tests must pass
npm run test:e2e
```

### Continuous Testing

Run tests after each file modification:
```bash
# Unit tests for modified layer
npm run test -- --watch

# Type checking
npm run type-check

# Integration tests (before merging)
npm run test:integration
```

---

## 4. ROLLBACK & SAFETY PROCEDURES

### Pre-Refactoring Backup

```bash
# 1. Create feature branch
git checkout -b refactor/clean-architecture

# 2. Tag current state
git tag refactor-start-point

# 3. Ensure all tests pass
npm run test:full
npm run type-check
npm run lint
```

### During Refactoring

**Rollback to phase start:**
```bash
# If Phase X breaks critical functionality
git reset --hard HEAD~n  # n = commits since phase start
git checkout prev-phase-tag
npm install
npm run test:full
```

**Rollback to entire refactoring:**
```bash
git checkout refactor-start-point
npm install
npm run test:full
```

### Per-Phase Verification

After each phase:
```bash
# 1. Type checking
npm run type-check

# 2. Linting
npm run lint -- --fix

# 3. Unit tests for modified layer
npm run test -- --testPathPattern="<layer>"

# 4. Integration tests
npm run test:integration

# 5. API contract verification (unchanged)
npm run test:api-contract
```

---

## 5. TIMELINE & EFFORT ESTIMATION

| Phase | Duration | Priority | Dependencies |
|-------|----------|----------|--------------|
| 1: Domain Cleanup | 2-4 hrs | CRITICAL | None |
| 2: Repository Abstraction | 4-6 hrs | CRITICAL | Phase 1 |
| 3: Controller Cleanup | 3-5 hrs | HIGH | Phase 2 |
| 4: Application/UseCase | 5-8 hrs | HIGH | Phase 3 |
| 5: DI Container | 4-6 hrs | HIGH | Phase 4 |
| 6: Strong Typing | 2-3 hrs | MEDIUM | Phase 5 |
| **Total** | **20-32 hrs** | - | Sequential |

**Recommended Execution:**
- Sprint 1 (Week 1): Phase 1-2 (6-10 hours)
- Sprint 2 (Week 2): Phase 3-4 (8-13 hours)
- Sprint 3 (Week 3): Phase 5-6 (6-9 hours)

---

## 6. SUCCESS CRITERIA

### Code Quality Metrics
- [ ] Zero Prisma imports in `src/modules/*/domain/` and `src/modules/*/services/`
- [ ] 100% test coverage for domain policies and use cases
- [ ] All controllers <30 lines of code
- [ ] Zero `any` types (except external libraries)
- [ ] TypeScript strict mode enabled and passing
- [ ] All architectural violations fixed (7 total → 0)

### Functionality Preservation
- [ ] API contracts unchanged (same endpoints, DTOs, error codes)
- [ ] Full e2e test suite passes
- [ ] No regressions in existing features
- [ ] All business rules enforced correctly

### Documentation
- [ ] Architecture documentation updated with new layering
- [ ] Context map updated with event flows
- [ ] Per-module dependency diagram created
- [ ] DI container registration documented

---

## 7. POST-REFACTORING

### Next Steps (After Refactor Complete)

1. **NestJS Migration Planning** (1-2 weeks)
   - Map Next.js API routes to NestJS controllers
   - Design NestJS module structure using bounded contexts
   - Plan incremental migration strategy

2. **Event-Driven Implementation** (1-2 weeks)
   - Integrate message broker (Redis Streams or Kafka)
   - Implement event publishers/subscribers per context
   - Add idempotency and deduplication

3. **Additional Features** (Ongoing)
   - New features built within Clean Architecture constraints
   - Module-by-module expansion without structural changes
   - Future microservice decomposition straightforward

---

## 8. APPENDIX: BEFORE/AFTER EXAMPLES

### Example 1: UserFactory Refactoring

**Before (Violates Clean Architecture):**
```typescript
// src/modules/auth/domain/UserFactory.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserFactory {
  static async create(data: CreateUserInput) {
    const role = await prisma.role.findUnique({
      where: { name: data.role }
    });
    
    return new User(data.id, data.email, data.name, role);
  }
}
```

**After (Clean Architecture compliant):**
```typescript
// src/modules/auth/domain/repositories/IRoleRepository.ts
export interface IRoleRepository {
  findByName(name: string): Promise<Role | null>;
}

// src/modules/auth/domain/UserFactory.ts
export class UserFactory {
  static create(data: CreateUserInput, role: Role): User {
    return new User(data.id, data.email, data.name, role);
  }
}

// src/modules/auth/services/AuthService.ts
export class AuthService {
  constructor(
    private userRepository: IUserRepository,
    private roleRepository: IRoleRepository
  ) {}
  
  async register(data: RegisterInput): Promise<User> {
    const role = await this.roleRepository.findByName(data.role);
    return UserFactory.create(data, role);
  }
}
```

### Example 2: QuizController Refactoring

**Before (Business logic in controller):**
```typescript
// src/modules/quiz/controllers/QuizController.ts
import { PrismaClient } from '@prisma/client';

export class QuizController {
  async submitQuiz(req: NextApiRequest, res: NextApiResponse) {
    const prisma = new PrismaClient();
    const quizRepo = new QuizRepository(prisma);
    
    // Lines 84-93: VIOLATION
    const answerIndex = parseInt(req.body.answer.replace('option_', ''));
    const answer = { questionId: req.body.qid, selectedIndex: answerIndex };
    
    // Lines 104-114: VIOLATION
    const correct = req.body.answers.filter(a => a.correct).length;
    const total = req.body.answers.length;
    const score = correct / total * 100;
    const grade = score >= 80 ? 'A' : 'B';
    
    res.status(200).json({ score, grade });
  }
}
```

**After (Clean separation of concerns):**
```typescript
// src/modules/quiz/domain/AnswerNormalizer.ts
export class AnswerNormalizer {
  static normalize(answerOption: string): number {
    return parseInt(answerOption.replace('option_', ''));
  }
}

// src/modules/quiz/domain/GradingPolicy.ts
export class GradingPolicy {
  static grade(correct: number, total: number): Grade {
    const score = (correct / total) * 100;
    const letterGrade = score >= 80 ? 'A' : 'B';
    return new Grade(score, letterGrade);
  }
}

// src/modules/quiz/application/SubmitQuizUseCase.ts
export class SubmitQuizUseCase extends ApplicationService<
  SubmitQuizCommand,
  QuizResultDto
> {
  constructor(
    private quizService: IQuizService,
    private eventPublisher: DomainEventPublisher
  ) {
    super();
  }
  
  async execute(command: SubmitQuizCommand): Promise<QuizResultDto> {
    return this.executeInTransaction(async () => {
      const normalizedAnswers = command.answers.map(a =>
        AnswerNormalizer.normalize(a)
      );
      
      const grade = GradingPolicy.grade(
        normalizedAnswers.filter((_, i) => normalizedAnswers[i]).length,
        normalizedAnswers.length
      );
      
      await this.eventPublisher.publish(
        new QuizSubmittedEvent(command.studentId, grade)
      );
      
      return QuizResultMapper.toDto(grade);
    });
  }
}

// src/modules/quiz/controllers/QuizController.ts
export class QuizController {
  constructor(private submitQuizUseCase: ISubmitQuizUseCase) {}
  
  async submitQuiz(req: NextApiRequest, res: NextApiResponse) {
    const command = new SubmitQuizCommand(req.body);
    const result = await this.submitQuizUseCase.execute(command);
    res.status(200).json(result);
  }
}
```

---

**Document Version:** 1.0  
**Last Updated:** [Today's Date]  
**Status:** Ready for Phase 1 Implementation  
**Author:** Copilot CLI  
