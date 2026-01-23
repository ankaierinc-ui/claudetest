# CLAUDE.md - AI Assistant Guide

**Last Updated:** 2026-01-23
**Repository:** ankaierinc-ui/claudetest
**Status:** Initial Repository Setup

---

## Table of Contents

1. [Overview](#overview)
2. [Repository Structure](#repository-structure)
3. [Technology Stack](#technology-stack)
4. [Development Workflows](#development-workflows)
5. [Git Conventions](#git-conventions)
6. [Code Conventions](#code-conventions)
7. [Testing Strategy](#testing-strategy)
8. [AI Assistant Guidelines](#ai-assistant-guidelines)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose
This document serves as a comprehensive guide for AI assistants (particularly Claude) working with this codebase. It documents the structure, conventions, and workflows to ensure consistent and effective collaboration.

### Repository Status
**Currently:** This is a newly initialized repository. As the codebase evolves, this document should be updated to reflect the actual implementation.

### Key Information
- **Remote URL:** `http://local_proxy@127.0.0.1:47861/git/ankaierinc-ui/claudetest`
- **Default Branch:** `main` (to be established)
- **Current Feature Branch:** `claude/claude-md-mkqktj8drm338hgx-KAx2t`

---

## Repository Structure

```
claudetest/
├── .git/                 # Git repository metadata
├── CLAUDE.md            # This file - AI assistant guide
└── [To be populated]
```

### Planned Structure (Update as implemented)
```
claudetest/
├── src/                 # Source code
├── tests/               # Test files
├── docs/                # Documentation
├── config/              # Configuration files
├── scripts/             # Build and utility scripts
├── .gitignore          # Git ignore patterns
├── README.md           # User-facing documentation
├── CLAUDE.md           # This file
└── [Other files]
```

---

## Technology Stack

### Primary Languages
- **To be determined** - Update this section when technologies are chosen

### Frameworks & Libraries
- **To be determined** - Update this section as dependencies are added

### Development Tools
- **Git:** Version control
- **GPG Signing:** Commits are signed using SSH keys
- **[Others TBD]**

### Build & Package Management
- **To be determined** - Document package manager (npm, pip, cargo, etc.)

---

## Development Workflows

### Initial Setup
```bash
# Clone the repository
git clone http://local_proxy@127.0.0.1:47861/git/ankaierinc-ui/claudetest
cd claudetest

# [Add setup steps as they're defined]
```

### Development Cycle
1. **Create a feature branch** (see Git Conventions below)
2. **Make changes** following code conventions
3. **Test changes** thoroughly
4. **Commit with descriptive messages**
5. **Push to remote**
6. **Create pull request**

---

## Git Conventions

### Branch Naming Strategy

#### For AI Assistants (Claude)
- **Pattern:** `claude/claude-md-<session-id>`
- **Example:** `claude/claude-md-mkqktj8drm338hgx-KAx2t`
- **CRITICAL:** Branch names MUST start with `claude/` and end with the matching session ID, otherwise push operations will fail with 403 errors

#### For Human Developers (Update as conventions are established)
- **Feature branches:** `feature/<description>`
- **Bug fixes:** `bugfix/<description>`
- **Hotfixes:** `hotfix/<description>`
- **Experimental:** `experiment/<description>`

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Example:**
```
feat: add user authentication module

Implement JWT-based authentication with refresh tokens.
Includes login, logout, and token refresh endpoints.

https://claude.ai/code/session_<id>
```

### Git Operations Best Practices

#### Pushing Changes
```bash
# Always use -u flag for first push to new branch
git push -u origin <branch-name>

# Retry logic for network failures:
# - Retry up to 4 times
# - Exponential backoff: 2s, 4s, 8s, 16s
```

#### Fetching/Pulling
```bash
# Prefer specific branch fetches
git fetch origin <branch-name>

# For pulls
git pull origin <branch-name>

# Same retry logic as push for network failures
```

#### Commit Signing
- All commits are automatically GPG-signed using SSH keys
- Signing key: `/home/claude/.ssh/commit_signing_key.pub`
- Format: SSH-based signing

---

## Code Conventions

### General Principles
- **Readability over cleverness:** Write clear, self-documenting code
- **DRY (Don't Repeat Yourself):** Extract common patterns
- **KISS (Keep It Simple, Stupid):** Avoid over-engineering
- **YAGNI (You Aren't Gonna Need It):** Don't add unused features

### Naming Conventions
**To be established based on chosen technology stack**

### File Organization
**To be established as codebase grows**

### Comments and Documentation
- Use comments sparingly; prefer self-documenting code
- Add comments for complex algorithms or non-obvious decisions
- Keep comments up-to-date with code changes
- Document public APIs thoroughly

---

## Testing Strategy

### Test Structure
**To be established**

### Running Tests
```bash
# [Add test commands when defined]
```

### Test Coverage
- **Target coverage:** TBD
- **Critical paths:** Must be tested
- **Edge cases:** Should be covered

---

## AI Assistant Guidelines

### Core Principles for Claude

1. **Read Before Modifying**
   - ALWAYS read files before suggesting changes
   - Understand context before proposing solutions
   - Never propose changes to code you haven't seen

2. **Minimal Changes**
   - Make only requested changes
   - Avoid unnecessary refactoring
   - Don't add features unless explicitly asked
   - No gratuitous improvements or "while we're here" changes

3. **Security First**
   - Watch for common vulnerabilities (XSS, SQL injection, command injection)
   - Validate input at system boundaries
   - Don't expose sensitive information
   - Follow OWASP best practices

4. **Task Management**
   - Use TodoWrite tool for complex multi-step tasks
   - Mark todos in progress before starting work
   - Mark todos completed immediately after finishing
   - Keep user informed of progress

5. **Communication**
   - Be concise and direct
   - Use technical accuracy over validation
   - No time estimates or predictions
   - Output text directly; never use echo or comments for communication

### Tool Usage

#### Preferred Tools
- **File Reading:** Use `Read` tool (not `cat`)
- **File Editing:** Use `Edit` tool (not `sed`/`awk`)
- **File Creation:** Use `Write` tool (not `echo >`)
- **File Search:** Use `Glob` for patterns
- **Content Search:** Use `Grep` for text search
- **Exploration:** Use `Task` tool with `Explore` agent for codebase exploration
- **Planning:** Use `Task` tool with `Plan` agent for architecture decisions

#### When to Use Task Tool
- Searching for context across multiple files
- Answering questions about codebase structure
- Planning complex implementations
- Running tests or builds
- Any multi-step process

#### Parallel Execution
- Run independent tool calls in parallel when possible
- Use sequential execution only when dependencies exist
- Never use placeholders for missing parameters

### Git Operations for AI

#### Creating Commits
**Only create commits when explicitly requested by the user**

**Process:**
1. Run `git status` (never use `-uall` flag)
2. Run `git diff` to see changes
3. Run `git log` to understand commit message style
4. Analyze changes and draft commit message
5. Stage specific files (prefer naming files over `git add .`)
6. Create commit with message ending in session URL
7. Verify with `git status`

**Commit Message Format:**
```bash
git commit -m "$(cat <<'EOF'
<type>: <description>

<body if needed>

https://claude.ai/code/session_<id>
EOF
)"
```

**Safety Rules:**
- NEVER update git config
- NEVER run destructive commands without explicit permission
- NEVER skip hooks (no `--no-verify`)
- NEVER amend commits unless explicitly requested
- NEVER force push to main/master
- NEVER commit sensitive files (.env, credentials)
- ALWAYS create NEW commits (not amend) after hook failures

#### Creating Pull Requests
**When explicitly requested:**

1. Run parallel git commands:
   - `git status`
   - `git diff`
   - Check remote tracking status
   - `git log` and `git diff [base]...HEAD`

2. Analyze ALL commits (not just the latest)

3. Create PR with proper format:
```bash
gh pr create --title "PR title" --body "$(cat <<'EOF'
## Summary
- Key change 1
- Key change 2

## Test plan
- [ ] Test item 1
- [ ] Test item 2

https://claude.ai/code/session_<id>
EOF
)"
```

---

## Common Tasks

### Adding a New Feature
**To be defined as patterns emerge**

### Fixing a Bug
**To be defined as patterns emerge**

### Refactoring Code
**To be defined as patterns emerge**

### Updating Dependencies
**To be defined based on package manager**

---

## Troubleshooting

### Git Push Fails with 403
**Cause:** Branch name doesn't follow Claude naming convention
**Solution:** Ensure branch starts with `claude/` and ends with session ID

### Network Errors During Git Operations
**Solution:** Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)

### Commit Signing Errors
**Check:**
- SSH signing key exists at `/home/claude/.ssh/commit_signing_key.pub`
- Git config has correct gpg settings
- `/tmp/code-sign` program is available

---

## Maintenance

### Updating This Document

**When to Update:**
- New technologies or frameworks added
- New conventions established
- Directory structure changes
- New workflows introduced
- Important patterns or decisions emerge

**How to Update:**
1. Read the current CLAUDE.md
2. Make targeted updates to relevant sections
3. Update the "Last Updated" date at the top
4. Commit with descriptive message: `docs: update CLAUDE.md - <what changed>`

**Keep This Document:**
- Accurate and current
- Focused on actionable information
- Clear and concise
- Relevant to AI assistants' needs

---

## Additional Resources

### External Documentation
- **To be added** - Links to external docs, APIs, frameworks

### Related Documents
- **README.md** - User-facing documentation (to be created)
- **CONTRIBUTING.md** - Contribution guidelines (if applicable)
- **LICENSE** - Project license (to be added)

---

**Note to AI Assistants:** This document is your primary reference for working with this codebase. Always consult it before making significant changes. When in doubt, ask the user for clarification rather than making assumptions.

**Note to Human Developers:** Please keep this document updated as the codebase evolves. It helps AI assistants provide better, more consistent assistance.
