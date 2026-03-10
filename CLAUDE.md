# CLAUDE.md

This file provides guidance for AI assistants (Claude Code and others) working in this repository.

## Repository Overview

**code-sandbox** is a personal sandbox repository for experimenting with Claude Code. It is currently a blank-slate environment — no language, framework, or build system has been chosen yet. Use it freely to prototype, test, or build small projects.

- **Owner:** AmundOyen
- **Remote:** `origin` → `http://local_proxy@127.0.0.1:38335/git/AmundOyen/code-sandbox`
- **Default branch:** `master`

## Current State

The repository contains only:

```
/
├── README.md    # One-liner project description
└── CLAUDE.md    # This file
```

No dependencies, build system, CI/CD, or source code exist yet. All of that is to be added as experiments evolve.

## Development Workflow

### Branching

- Feature/experiment branches should follow: `<topic>/<short-description>`
- Claude Code agent branches are named: `claude/<task-id>`
- Never push directly to `master` without review

### Committing

Write short, imperative commit messages:

```
Add initial Python script for CSV parsing
Fix off-by-one error in loop
Remove unused imports
```

Avoid vague messages like "update", "fix", or "WIP" without context.

### Pushing

Always push with upstream tracking:

```bash
git push -u origin <branch-name>
```

## AI Assistant Conventions

When working in this repo as an AI agent:

1. **Read before editing.** Always read existing files before modifying them.
2. **Minimal changes.** Only change what is necessary for the task. Avoid refactoring unrelated code.
3. **No unnecessary files.** Do not create documentation, README updates, or helper utilities unless explicitly requested.
4. **Ask when ambiguous.** If the task is unclear or could be interpreted in multiple ways, ask before writing code.
5. **Respect security.** Never introduce SQL injection, XSS, command injection, or other OWASP Top 10 vulnerabilities. Never hardcode secrets.
6. **No over-engineering.** Prefer simple, direct solutions. Skip error handling for impossible cases; skip abstraction for one-off uses.

## Adding a New Project

When a new experiment or project is started in this repo, update this file with:

- **Language & runtime** (e.g., Python 3.12, Node.js 22, Go 1.23)
- **Framework** (e.g., FastAPI, Express, Gin)
- **Dependency manager** (e.g., pip + `requirements.txt`, npm, cargo)
- **How to install dependencies**
- **How to run the project**
- **How to run tests**
- **Lint/format commands**
- **Environment variables** (names and purpose — never values)

### Example template to fill in:

```markdown
## Stack

- Language: <language and version>
- Framework: <framework>
- Package manager: <tool>

## Setup

```bash
<install command>
```

## Running

```bash
<run command>
```

## Testing

```bash
<test command>
```

## Linting / Formatting

```bash
<lint command>
<format command>
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FOO`    | Used for X  |
```
