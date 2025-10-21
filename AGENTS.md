# Repository Guidelines

## Project Structure & Module Organization
- `src/main.ts` bootstraps the NestJS application, with `app.module.ts` wiring feature modules.
- `src/download/` holds the file-delivery feature (`*.controller.ts`, `*.service.ts`, `*.module.ts`), while shared helpers live in `src/shared/util.ts`.
- Root-level `public/` stores static assets exposed by the server; `dist/` is generated output from `yarn build`.
- Tests reside alongside source as `*.spec.ts`, with end-to-end suites under `test/` (see `test/app.e2e-spec.ts`).

## Build, Test, and Development Commands
- `yarn start:dev` boots the API with hot reload for local work (`NODE_ENV=development`).
- `yarn build` compiles TypeScript into `dist/` via the Nest CLI; run this before `yarn start:prod`.
- `yarn start:prod` builds (if needed) and launches the compiled bundle under PM2 (`dist/main.js`).
- `yarn lint` applies ESLint to `src` and `test`; `yarn format` enforces Prettier on TypeScript sources.
- `yarn test`, `yarn test:watch`, and `yarn test:cov` execute Jest suites; `yarn test:e2e` targets `test/jest-e2e.json`.

## Coding Style & Naming Conventions
- Follow Prettier defaults (2-space indent, single quotes) with ESLint fixes committed clean. Run `yarn format && yarn lint` before pushing.
- Name classes and Nest providers with `PascalCase`, services with the `*Service` suffix, controllers with `*Controller`, and utility exports in `camelCase`.
- Keep modules cohesive: group related controllers/services under a dedicated directory mirroring `download/` as the pattern.

## Testing Guidelines
- Write unit tests as `*.spec.ts` beside the implementation to stay inside Jest’s `rootDir` (`src`).
- Ensure E2E scenarios live in `test/*.e2e-spec.ts`; use Supertest for HTTP flows and keep fixtures in the same folder.
- Aim to keep `yarn test:cov` above current coverage levels and expand coverage for new modules before merging.

## Commit & Pull Request Guidelines
- Prefer conventional commits (`feat:`, `fix:`, `chore:`) with imperative summaries (`feat: add streaming download response`). Avoid ambiguous verbs or status updates.
- Draft PRs with a brief problem/solution outline, test evidence (`yarn test` output or screenshots for HTTP responses), and reference any issue IDs.
- Keep PRs scoped to one feature or fix; include notes about configuration or manual steps required for reviewers.
