# ==========================================

# CURSOR PREFERENCES FOR FULL-STACK TYPESCRIPT

# (React Native + Node.js + AWS + Prisma/Postgres + Redis)

# ==========================================

# 1. CORE TYPESCRIPT PREFERENCES

- Always use explicit types for function arguments and return types. Avoid 'any' at all costs; use 'unknown' if needed.
- Prefer TypeScript 'interfaces' for public API contracts/component props, and 'types' for unions or utility types.
- Enforce strict null checks. Handle potential 'undefined' or 'null' errors gracefully with optional chaining (?.) or nullish coalescing (??).
- Use descriptive, type-safe enums or const assertions (as const) for fixed configuration values.
- Prefer modern ES6+ features (destructuring, arrow functions for callbacks, template literals).

# 2. CODE OUTPUT CONSTRAINTS (TOKEN SAVING)

- DO NOT rewrite an entire file if only modifying a specific block. Output ONLY the modified sections or use concise diffs.
- Omit boilerplate code, long comment blocks, or repetitive import statements unless explicitly asked.
- Replace unchanged, massive blocks of code with a comment like: `// ... rest of the existing code remains unchanged`.
- Keep code explanations incredibly brief and focused entirely on architectural trade-offs.

# 3. WORKFLOW & REFACTORING RULES

- Do not make destructive file updates or install npm packages without asking for confirmation first.
- If a compilation error or type mismatch occurs, state the root cause in one sentence before proposing a fix.
- Ensure all generated code adheres to standard ESLint and Prettier formatting to prevent git diff clutter.
- Prioritize functional programming patterns (immutability, pure functions) unless an object-oriented approach is structurally superior.

# 4. MOBILE FRONTEND (REACT NATIVE & TS)

- Write modern functional components using hooks. Keep state local where possible.
- Optimize for performance: use `useCallback` and `useMemo` for heavy operations passed to child components.
- Never write nested scrollable views (e.g., ScrollView inside ScrollView). Use `FlatList` or `FlashList` for dynamic data.
- Ensure proper platform checks (`Platform.OS === 'ios'`) when dealing with native UI quirks or safe area insets.
- Handle offline states, network timeouts, and loading skeletons gracefully.

# 5. BACKEND API & AWS (NODE.JS & TS)

- Follow stateless REST or clean GraphQL patterns for Node.js API handlers.
- Handle AWS SDK (v3) calls safely. Keep credentials externalized via environment variables.
- Wrap all AWS operations (S3 uploads, Cognito auth, SQS queues) in robust try/catch blocks with structural logging.
- Optimize AWS Lambda functions (if serverless) by instantiating AWS clients outside the global handler to leverage container reuse.

# 6. DATABASE LAYER (PRISMA & POSTGRESQL)

- Rely on Prisma’s strong typing rather than writing raw, unsafe SQL fragments.
- Always include relational fields carefully. Use select/include statements explicitly to prevent N+1 query problems.
- Ensure proper database transaction wrapping (`prisma.$transaction`) when making multi-table mutations.
- Write robust, atomic up/down migrations instead of manually editing production schemas.

# 7. CACHING & PERFORMANCE (REDIS)

- Always check the Redis cache _before_ hitting Prisma/Postgres for high-read, low-write queries.
- Every Redis `set` operation MUST explicitly declare an expiration time (TTL) to prevent memory leak crashes.
- Handle Redis connection dropouts gracefully; do not let a failed Redis connection crash the main Node.js server.
- Serialize/deserialize JSON payloads accurately when saving or retrieving from cache keys.
