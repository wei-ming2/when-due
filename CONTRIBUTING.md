# Contributing to When Due

Thanks for contributing.

This project values product clarity over feature volume. If a change makes the app heavier, noisier, or less trustworthy as a deadline tracker, it is probably the wrong change.

## Repository

- Repo: [github.com/wei-ming2/when-due](https://github.com/wei-ming2/when-due)
- Issues: [github.com/wei-ming2/when-due/issues](https://github.com/wei-ming2/when-due/issues)

## Setup

```bash
git clone https://github.com/wei-ming2/when-due.git
cd when-due
npm install
npm run tauri:dev
```

More setup details: [docs/SETUP.md](./docs/SETUP.md)

## Before Opening a PR

Run:

```bash
npm run type-check
npm test -- --run
cargo check --manifest-path src-tauri/Cargo.toml
```

## What Good Contributions Look Like

- Fewer clicks, less friction, or clearer visual hierarchy
- Better deadline reliability and persistence
- Better platform polish on macOS or Windows
- Simpler codepaths for core flows
- Smaller, well-tested improvements instead of broad speculative features

## What To Avoid

- Reintroducing heavy “productivity suite” behavior
- Adding complexity that makes everyday capture slower
- Shipping UI that looks clever but feels harder to use
- Letting docs drift away from the actual product

## Pull Request Notes

Please include:

- what changed
- why it improves the product
- any manual test steps
- screenshots or screen recordings for visible UI changes

## Issue Reporting

Helpful bug reports include:

- platform and OS version
- exact input or interaction that triggered the bug
- what you expected
- what happened instead
- screenshot or short recording if the issue is visual
