# CLAUDE.md

This file provides guidance for AI assistants (Claude Code and similar tools) working in this repository.

## Repository Overview

**Name:** `-` (personal work repository)
**Description:** מאגר עבודה — a personal workspace repository.
**Language context:** The repository owner communicates in Hebrew; documentation and commit messages may appear in Hebrew or English.

## Current State

This repository is in an early/empty stage. At the time this file was created, it contains only a minimal `README.md`. There is no source code, build system, or dependency configuration yet.

## Development Branch

When working in this repository via Claude Code:
- Feature/documentation branches follow the pattern `claude/<description>-<id>`
- Push changes to the designated branch and open a PR rather than pushing directly to `main`

## Git Conventions

- **Commit messages:** Clear and descriptive; Hebrew or English are both acceptable
- **Branch naming:** `claude/<short-description>-<id>` for AI-generated branches
- **Signing:** Commits are signed via SSH (configured in the repo's git config)
- **Push command:** Always use `git push -u origin <branch-name>`

## When Code Is Added

Once source code is introduced, update this file with:
- **Language & runtime:** The primary programming language and version
- **Project structure:** Directory layout and the purpose of each directory
- **Dependencies:** How to install dependencies (e.g., `npm install`, `pip install -r requirements.txt`)
- **Build:** How to compile or bundle the project
- **Tests:** How to run the test suite and where tests live
- **Lint/format:** Any linters or formatters and how to run them
- **Environment variables:** Required `.env` keys and their purpose
- **Key conventions:** Naming conventions, architectural patterns, style preferences

## Notes for AI Assistants

- This is a personal workspace; prefer minimal, clean changes over large refactors
- Avoid creating unnecessary files — edit existing ones where possible
- If the README or other documentation is in Hebrew, preserve that language unless asked to change it
- Do not push to `main` directly; always use a feature branch and open a PR
