# Project context

- This repository contains a Slidev presentation.
- The main deck file is `slides.md`.
- Use `slides.template.md` as the syntax and feature reference for Slidev patterns.
- Keep presentation edits focused on slide content unless explicitly asked to change tooling.

## Files and responsibilities

- `slides.md`: source of truth for the presentation. Each slide is separated by `---` and can have its own frontmatter.
- `slides.template.md`: example syntax for frontmatter, layouts, transitions, components, code blocks, notes, and slide-level styling.
- `components/`: Vue components that can be embedded in slides.
- `snippets/`: external code snippets that can be embedded with `<<< @/snippets/...`.

## Commands

- Development: `npm run dev`
- Build: `npm run build`
- Export: `npm run export`

## Editing guidelines

- Preserve top-level YAML frontmatter in `slides.md` (theme, title, info, transition, duration, etc.).
- Separate slides with `---` exactly.
- Use Markdown first; introduce Vue/HTML blocks only when needed for interactivity or layout.
- Prefer one key idea per slide and concise bullet points.
- Keep heading hierarchy clear (`#` for slide title, `##` for sections when needed).
- When adding code examples, always use fenced code blocks with an explicit language tag.
- Follow syntax patterns from `slides.template.md` for:
  - per-slide frontmatter
  - layouts (`layout:`, `layoutClass:`)
  - transitions
  - `Toc` and other Slidev components
  - slide notes (`<!-- ... -->` at end of slide)
  - embedded external snippets (`<<< @/...`)
- **Every per-slide frontmatter block MUST be fully enclosed between `---` delimiters.** A bare key like `layout: section` on its own line (without a closing `---`) is invalid and will cause a YAML parse error. Always use the form:
  ```
  ---
  layout: section
  ---
  ```
  This applies to all frontmatter keys: `layout`, `transition`, `layoutClass`, etc.
- **`level: 1` is the default** — never emit it. Only use `level: 2` (or higher) when explicitly needed for a sub-slide. If `level: 1` would be the only key in a slide's frontmatter, omit the frontmatter block entirely and go straight to slide content.

## Consistency rules

- Keep tone and terminology consistent with the current deck topic: shift-left performance testing.
- Prefer plain, direct language suitable for technical presentations.
- Do not rename core files (`slides.md`, `slides.template.md`) unless explicitly requested.
- Avoid introducing unrelated dependencies or build changes.
- Generate slide-ready Markdown that is valid Slidev syntax.
- Propose layout and transition choices only when they improve clarity.
- Reuse existing project patterns before introducing new ones.
- When asked to add or refactor slides, keep diffs minimal and localized.
