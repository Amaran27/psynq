// Architectural dependency rules for Hexagonal Architecture
// See https://github.com/sverweij/dependency-cruiser

/** @type {import('dependency-cruiser').IConfig} */
module.exports = {
  forbidden: [
    // Domain must not depend on frameworks (NestJS, TypeORM, bcrypt)
    {
      name: 'no-domain-to-framework',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/domain' },
      to: { path: '^(?:@nestjs/|typeorm|bcrypt)' },
    },
    // Domain must not depend on adapters
    {
      name: 'no-domain-to-adapters',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/domain' },
      to: { path: '^src/modules/[^/]+/adapters' },
    },
    // Domain must not depend on application (use cases)
    {
      name: 'no-domain-to-application',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/domain' },
      to: { path: '^src/modules/[^/]+/application' },
    },
    // Ports must not depend on frameworks
    {
      name: 'no-ports-to-framework',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/ports' },
      to: { path: '^(?:@nestjs/|typeorm|bcrypt)' },
    },
    // Ports must not depend on adapters
    {
      name: 'no-ports-to-adapters',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/ports' },
      to: { path: '^src/modules/[^/]+/adapters' },
    },
    // Adapters must not depend on domain internals other than public types
    // (Relaxed rule: allow importing domain model, forbid circular deps)
    {
      name: 'no-adapter-to-controller',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/adapters' },
      to: { path: '^src/modules/[^/]+/user\\.controller' },
    },
  ],
};
