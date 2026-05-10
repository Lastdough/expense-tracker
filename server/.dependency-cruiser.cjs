/**
 * Encodes the Dependency Rule from CLAUDE.md. CI runs `pnpm lint:deps`
 * which fails the build if any rule below fires.
 *
 * Layer order inside a bounded context:
 *
 *   interfaces ──┐
 *                ├──► application ──► domain
 *   infrastructure ─┘
 *
 * Cross-context: only `application -> other-context/application` is allowed.
 * Reaching into another context's domain/infrastructure/interfaces is forbidden.
 *
 * `domain/` and `application/` must remain free of infrastructure libraries
 * (Prisma, Express, Zod, Vite). Tech leaks here are the primary failure mode
 * the rule exists to catch.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make ordering impossible to reason about.',
      from: {},
      to: { circular: true },
    },

    // ── Layer rules within a context ─────────────────────────────────────────
    {
      name: 'domain-may-not-depend-outward',
      severity: 'error',
      comment:
        'domain/ depends only on its own domain/ and shared-kernel/. Outward = application, infrastructure, or interfaces.',
      from: { path: '^src/contexts/[^/]+/domain/' },
      to: { path: '^src/contexts/[^/]+/(application|infrastructure|interfaces)/' },
    },
    {
      name: 'application-may-not-depend-on-infra-or-interfaces',
      severity: 'error',
      comment: 'application/ may not import from infrastructure/ or interfaces/.',
      from: { path: '^src/contexts/[^/]+/application/' },
      to: { path: '^src/contexts/[^/]+/(infrastructure|interfaces)/' },
    },
    {
      name: 'infrastructure-may-not-depend-on-application-or-interfaces',
      severity: 'error',
      comment: 'infrastructure/ may import from its own domain/ only.',
      from: { path: '^src/contexts/[^/]+/infrastructure/' },
      to: { path: '^src/contexts/[^/]+/(application|interfaces)/' },
    },
    {
      name: 'interfaces-may-not-depend-on-domain-or-infrastructure',
      severity: 'error',
      comment: 'interfaces/ talks only to its own application/.',
      from: { path: '^src/contexts/[^/]+/interfaces/' },
      to: { path: '^src/contexts/[^/]+/(domain|infrastructure)/' },
    },

    // ── Cross-context rules ──────────────────────────────────────────────────
    {
      name: 'no-cross-context-domain-or-infrastructure',
      severity: 'error',
      comment:
        'A context must not reach into another context\'s domain/, infrastructure/, or interfaces/. Cross-context calls go application -> application only.',
      from: { path: '^src/contexts/([^/]+)/' },
      to: {
        path: '^src/contexts/([^/]+)/(domain|infrastructure|interfaces)/',
        pathNot: '^src/contexts/$1/',
      },
    },
    {
      name: 'only-application-may-cross-contexts',
      severity: 'error',
      comment:
        'Only application/ may import from another context — and only that other context\'s application/.',
      from: {
        path: '^src/contexts/([^/]+)/(domain|infrastructure|interfaces)/',
      },
      to: {
        path: '^src/contexts/([^/]+)/',
        pathNot: '^src/contexts/$1/',
      },
    },

    // ── Tech-leak rules ──────────────────────────────────────────────────────
    {
      name: 'no-tech-leak-into-domain-or-application',
      severity: 'error',
      comment:
        'domain/ and application/ must stay free of infrastructure libraries (Prisma, Express, Zod, Vite). If you need a type, define it in the domain.',
      from: { path: '^src/contexts/[^/]+/(domain|application)/' },
      to: {
        path:
          'node_modules/(@prisma/[^/]+|prisma|express|zod|vite|@vitejs/[^/]+|cors|better-sqlite3)/',
      },
    },
    {
      name: 'no-tech-leak-into-shared-kernel',
      severity: 'error',
      comment: 'shared-kernel/ is pure. No infrastructure libraries.',
      from: { path: '^src/shared-kernel/' },
      to: {
        path:
          'node_modules/(@prisma/[^/]+|prisma|express|zod|vite|@vitejs/[^/]+|cors|better-sqlite3)/',
      },
    },

    // ── Direction rules ──────────────────────────────────────────────────────
    {
      name: 'shared-kernel-must-not-depend-on-contexts',
      severity: 'error',
      comment: 'shared-kernel/ is depended on by everything; it depends on nothing in contexts/.',
      from: { path: '^src/shared-kernel/' },
      to: { path: '^src/contexts/' },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['main', 'types'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
