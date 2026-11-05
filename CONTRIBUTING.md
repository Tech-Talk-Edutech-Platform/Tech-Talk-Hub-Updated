# Contributing to Tech Talk Hub

These are the standards every change must meet before it is merged into `main`.
Most of them are enforced automatically — if the tools are happy, you're most of the way there.

## Quick start

```bash
bun install        # installs dependencies and sets up the git hooks
bun run dev        # start the dev server
bun run check      # run everything CI runs, before you push
```

Use **Bun** for all package commands (`bun add`, `bun remove`). Don't commit a
`package-lock.json`, `yarn.lock` or `pnpm-lock.yaml` — `bun.lock` is the only lockfile.

## Git workflow

1. **Never push directly to `main`.** All changes go through a pull request.
2. Branch off the latest `main`, using a prefix that describes the change:

   | Prefix      | Use for                                  | Example                     |
   | ----------- | ---------------------------------------- | --------------------------- |
   | `feat/`     | New features                             | `feat/speaker-profile-page` |
   | `fix/`      | Bug fixes                                | `fix/navbar-mobile-overlap` |
   | `refactor/` | Code changes that don't change behaviour | `refactor/event-card-props` |
   | `style/`    | UI/styling-only changes                  | `style/footer-spacing`      |
   | `docs/`     | Documentation                            | `docs/setup-guide`          |
   | `chore/`    | Tooling, dependencies, config            | `chore/upgrade-vite`        |

3. Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org) style:
   `feat: add speaker profile page`, `fix: stop navbar overlapping hero on mobile`.
   Use the imperative mood ("add", not "added") and keep the first line under ~72 characters.
4. Keep PRs small and focused — one feature or fix per PR. Large PRs are slow to review and risky to merge.
5. Open the PR against `main` and fill in the template.

### Merge requirements

A PR can be merged into `main` only when:

- ✅ The **CI / Quality checks** workflow passes (formatting, lint, type check, build)
- ✅ At least **one teammate has approved** it
- ✅ It is up to date with `main` and has no merge conflicts
- ✅ All review comments are resolved

PRs are merged with **Squash and merge**, so the PR title becomes the commit on `main` —
make sure it follows the Conventional Commits style too.

## Automated checks

| Check      | Tool                                             | Run locally            | Auto-fix           |
| ---------- | ------------------------------------------------ | ---------------------- | ------------------ |
| Formatting | [Prettier](https://prettier.io)                  | `bun run format:check` | `bun run format`   |
| Linting    | [oxlint](https://oxc.rs/docs/guide/usage/linter) | `bun run lint`         | `bun run lint:fix` |
| Types      | TypeScript                                       | `bun run typecheck`    | —                  |
| Build      | Vite                                             | `bun run build`        | —                  |

A **pre-commit hook** (Husky + lint-staged) automatically lints and formats the files you've
staged, so most issues are fixed before they ever reach a PR. Lint **warnings fail the build**
the same as errors — fix them rather than letting them pile up.

If you genuinely need to disable a lint rule, do it on the single line, with a reason:

```tsx
// oxlint-disable-next-line react/exhaustive-deps -- only run on mount
```

Never use `git commit --no-verify` to skip the hooks — CI will catch it anyway.

### Editor setup (VS Code)

Install the recommended extensions when prompted (oxc, Prettier, Tailwind CSS IntelliSense,
EditorConfig). The shared workspace settings format on save and apply lint fixes for you.

## Coding standards

### TypeScript

- **No `any`.** Use a proper type, or `unknown` and narrow it.
- Type component props with a `type` named after the component:

  ```tsx
  type SpeakerCardProps = {
    name: string
    role?: string
  }

  export function SpeakerCard({ name, role }: SpeakerCardProps) { … }
  ```

- Use `import type { … }` for type-only imports (TypeScript enforces this).
- Avoid non-null assertions (`value!`). Handle the `null`/`undefined` case instead.
- Always `await` (or explicitly `void`) promises — floating promises are a lint error.

### React

- Function components only. One component per file.
- Hooks follow the rules of hooks and start with `use` (`useEvents`, `useAuth`).
- The **React Compiler** is enabled, so don't add `useMemo` / `useCallback` / `memo`
  for performance unless you've measured a problem.
- Every list item needs a stable `key` — use an id, never the array index for lists that change.
- Keep components small. If a component grows past ~150 lines or does several jobs, split it.
- Fetch data and handle side effects in hooks, not directly in JSX-heavy components.

### Naming and file structure

| Thing                 | Convention                    | Example                |
| --------------------- | ----------------------------- | ---------------------- |
| Components            | `PascalCase.tsx`              | `EventCard.tsx`        |
| Pages / routes        | `PascalCase.tsx` in `pages/`  | `pages/EventsPage.tsx` |
| Hooks                 | `camelCase.ts` starting `use` | `hooks/useEvents.ts`   |
| Utilities             | `camelCase.ts`                | `lib/formatDate.ts`    |
| Constants             | `UPPER_SNAKE_CASE`            | `MAX_SPEAKERS`         |
| Variables / functions | `camelCase`                   | `upcomingEvents`       |

Suggested layout for `src/`:

```
src/
  assets/       images, fonts, icons
  components/   reusable UI components
  pages/        one component per route
  hooks/        custom React hooks
  lib/          helpers, API clients, utilities
  types/        shared TypeScript types
```

### Styling (Tailwind CSS)

- Use Tailwind utility classes. Don't add new `.css` files — global styles and theme
  tokens live in `src/index.css`.
- Don't worry about class order; Prettier sorts Tailwind classes automatically.
- Avoid inline `style={{ … }}` unless a value is truly dynamic.
- Build mobile-first: base classes for small screens, then `sm:`, `md:`, `lg:`.

### Accessibility

Accessibility rules are enforced by the linter (`jsx-a11y`). In particular:

- Every `<img>` needs an `alt` (use `alt=""` for purely decorative images).
- Use `<button>` for actions and `<a>`/`<Link>` for navigation — not clickable `<div>`s.
- Form inputs need a visible `<label>`.

### General

- No `console.log` in committed code (`console.warn` / `console.error` are allowed for real errors).
- Use `===` / `!==`, `const` by default, `let` only when reassigning, never `var`.
- Delete dead code instead of commenting it out — git keeps the history.
- Never commit secrets. Put them in `.env.local` (git-ignored) and expose only
  `VITE_`-prefixed values the browser genuinely needs.
