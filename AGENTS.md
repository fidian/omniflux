# AGENTS.md

## Purpose

This repository builds **OmniFlux**, a single-file wiki. Prioritize portability, small output size, and maintainable source that compiles/minifies cleanly.

## Core Product Goals

1. Keep OmniFlux as a self-contained wiki in one HTML file.
2. Preserve no-build/no-backend runtime usage for normal users.
3. Keep output git-friendly (readable diffs/newlines in saved HTML).
4. Maintain CSS-based navigation and CSS-based sidebar expansion so reading works without JavaScript.
5. Preserve bidirectional Markdown/HTML behavior and wiki features documented in the in-app articles.

## JavaScript Size and Token Policy (Important)

The focus is to have **minimal code** in `omniflux.js` (not minified source, but less code to minify).

1. Prefer constructs with fewer JavaScript tokens when behavior is equivalent.
2. Use modern baseline JS features when they reduce token count and keep clarity.
3. Example preference:
   - Prefer `if (event.target?.tagName === 'A')` over `if (event.target && event.target.tagName === 'A')`.
4. Reuse helpers and existing utilities instead of duplicating logic.
5. Avoid verbose defensive patterns when concise baseline-safe syntax exists.
6. Keep `// @ts-check` and JSDoc typing approach intact unless there is a strong reason to change it.

## Project Structure Notes

- `omniflux.html`: The app and documentation content live here. Most feature documentation is in wiki articles inside this file.
- `omniflux.js`: Core runtime logic (editing, markdown/html conversion, save/import/upload/search/state).
- `omniflux.css`: Core styling, flags, layout, print behavior, CSS navigation/sidebar behavior.
- `README.md`: External project overview and high-level feature list.

## Coding Patterns to Follow

1. Keep code dependency-free and framework-free.
2. Prefer small reusable helpers over repeated inline logic.
3. Match existing naming conventions (`of-` classes, hyphenated IDs, existing helper names).
4. Preserve conversion behavior symmetry: changes in Markdown→HTML often require corresponding HTML→Markdown updates.
5. Preserve content transclusion and index/backlink/broken-link flows when touching content/state updates.
6. Keep browser compatibility aligned with modern baseline web platform features used by the repo.

## Documentation Requirements

1. **Keep `README.md` current** with meaningful user-facing changes.
2. The majority of feature documentation is in `omniflux.html` articles; keep them current with behavior changes.
3. If behavior, feature scope, shortcuts, or save/import flows change, update relevant docs.

## Testing and Validation Requirements

1. Any change that can be easily tested should be tested.
2. Prioritize targeted checks related to modified behavior.
3. For parser/converter behavior changes, ensure round-trip expectations still hold (Markdown↔HTML where applicable).
4. Do not skip practical verification for save/edit/navigation/search/import/upload paths when touched.

## Agent Working Rules

1. Make surgical changes; do not refactor unrelated areas.
2. Preserve existing behavior unless change is requested. If an improvement is suggested, ask for confirmation before changing behavior.
3. If introducing a new approach, prefer the one with fewer JS tokens when tradeoffs are otherwise equal.
4. Keep comments concise and only where they add real value.
5. When uncertain about intent that changes behavior, ask before broad changes.
