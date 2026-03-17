# Contributing

Thank you for your interest in Deadline Tracker!

## Before Contributing

This is a personal learning project, but I'm happy to receive feedback and contributions. Before you start:

1. **Check existing issues** — See if someone's already working on this
2. **Open an issue first** — Describe your idea or bug report
3. **Wait for feedback** — I'll let you know if it aligns with the project vision

## Development Setup

Follow the guide in [SETUP.md](docs/SETUP.md).

## Contribution Workflow

1. **Fork and clone** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make changes** and test locally
4. **Commit with conventional messages**: `git commit -m "feat: add task reminders"`
5. **Push**: `git push origin feature/your-feature`
6. **Create a Pull Request** with description

## Code Standards

- **Formatting**: `npm run format` (Prettier)
- **Linting**: `npm run lint` (ESLint)
- **Type checking**: `npm run type-check`
- **Tests**: `npm run test` (ensure all pass)

## Conventional Commits

Use semantic commit messages:

```bash
feat:       New feature
fix:        Bug fix
docs:       Documentation changes
refactor:   Code refactoring
style:      Code style changes
test:       Test changes
chore:      Dependency updates, build changes
```

Example:
```bash
git commit -m "feat: add task notification preferences"
```

## Testing

- Add unit tests for new functions
- Add integration tests for features
- Always test on macOS (also Windows/Linux if possible)

## Questions?

Open an issue or ask in the discussion section. Happy coding! 🎉
