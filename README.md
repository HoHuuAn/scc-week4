# Week 4: CI/CD Pipeline with GitHub Actions & Azure DevOps

## Focus
- CI/CD pipelines, stages (build → test → deploy)
- GitHub Actions
- Azure DevOps Pipelines deep dive: YAML syntax, triggers (push/PR), jobs, steps
- Hands-on: Add simple deploy step pipeline for Hello World app

## Expected Outcomes
- Builds and understands a basic GitHub Actions workflow YAML file from scratch
- Triggers successful CI runs on push/PR
- Can explain CI/CD benefits and common pipeline stages

---

## Exercises Overview

| # | Exercise | Focus |
|---|----------|-------|
| 1 | Hello World Pipeline | Basic workflow, triggers, steps |
| 2 | Node.js App Pipeline | Build + Test + Lint stages |
| 3 | Multi-Job Pipeline | Jobs, dependencies, artifacts |
| 4 | PR-Triggered Pipeline | PR checks, status validation |
| 5 | Matrix Build Pipeline | Multi-version testing |

---

## Exercise 1: Hello World Pipeline

**Goal:** Create your first CI pipeline that prints "Hello, DevOps!"

### Steps

1. Create a new repository on GitHub (or use this one)
2. Create `.github/workflows/hello.yml`:
```yaml
name: Hello World CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  hello:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Print Hello
        run: echo "Hello, DevOps!"

      - name: Print whoami
        run: |
          echo "Today is $(date)"
          echo "Runner: ${{ runner.os }}"
```

3. Push and watch the pipeline run in the **Actions** tab!

**Questions to answer:**
- What does `runs-on: ubuntu-latest` mean?
  > `runs-on` specifies the type of virtual machine (runner) that executes the job. `ubuntu-latest` is a GitHub-hosted runner running Ubuntu (currently Ubuntu 22.04). Other options include `windows-latest`, `macos-latest`, or self-hosted runners.
- What triggers this workflow?
  > Two triggers are defined:
  > - `push` to branches `[main]` — runs when code is pushed to the main branch.
  > - `pull_request` to branches `[main]` — runs when a PR is opened/synced targeting main.
- What is `${{ runner.os }}`?
  > It's a context expression that returns the operating system of the runner. For `ubuntu-latest` it returns `"Linux"`, for `windows-latest` it returns `"Windows"`, etc. This is useful for writing portable steps that behave differently on different OSes.

---

## Exercise 2: Node.js App Pipeline (Build + Test + Lint)

**Goal:** Build a pipeline that installs dependencies, lints code, and runs tests.

### Files to create

**`app.js`**
```javascript
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}

module.exports = { add, subtract, multiply };
```

**`app.test.js`**
```javascript
const { add, subtract, multiply } = require('./app');

test('adds two numbers', () => {
  expect(add(2, 3)).toBe(5);
});

test('subtracts two numbers', () => {
  expect(subtract(5, 3)).toBe(2);
});

test('multiplies two numbers', () => {
  expect(multiply(4, 3)).toBe(12);
});
```

**`package.json`**
```json
{
  "name": "week4-nodejs-app",
  "version": "1.0.0",
  "scripts": {
    "test": "jest",
    "lint": "eslint app.js"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}
```

**`.github/workflows/node-ci.yml`**
```yaml
name: Node.js CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test
```

**Questions to answer:**
- What is the difference between `npm install` and `npm ci`?
  > `npm install` reads `package.json` and may update packages incrementally (smart enough to skip unchanged deps). `npm ci` (clean install) deletes `node_modules` first and installs **exact** versions from `package-lock.json` — faster, more reliable, and the preferred method in CI/CD because it guarantees a reproducible build.
- How many stages does this pipeline have?
  > 3 stages (steps):
  > 1. **Install dependencies** (`npm ci`)
  > 2. **Run linter** (`npm run lint`)
  > 3. **Run tests** (`npm test`)
- What happens if the linter fails?
  > The job **fails immediately** at that step (unless `continue-on-error: true` is set). Because the linter step runs **before** the test step, the test stage is never reached — a failing linter gates the entire pipeline, which is the intended CI gatekeeping behavior.

---

## Exercise 3: Multi-Job Pipeline with Artifacts

**Goal:** Build a pipeline with multiple jobs that pass artifacts between them.

### `.github/workflows/multi-job.yml`

```yaml
name: Multi-Job Pipeline

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.tag }}
    steps:
      - uses: actions/checkout@v4

      - name: Generate build version
        id: version
        run: echo "tag=v1.0.0-$(date +%Y%m%d%H%M%S)" >> $GITHUB_OUTPUT

      - name: Create build artifact
        run: |
          echo "Build: ${{ steps.version.outputs.tag }}"
          echo "Built at: $(date)" > build.txt
          echo "Content: Hello from build job" >> build.txt

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: my-build-artifact
          path: build.txt
          retention-days: 7

  deploy:
    needs: build  # Wait for build job
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: my-build-artifact

      - name: Display build info
        run: |
          echo "Build version: ${{ needs.build.outputs.version }}"
          cat build.txt

      - name: Simulate deploy
        run: echo "Deploying version ${{ needs.build.outputs.version }}..."
```

**Questions to answer:**
- What does `needs: build` do?
  > `needs: build` makes the `deploy` job **dependent** on the `build` job completing first. GitHub Actions will not start `deploy` until `build` finishes successfully (or fails — by default downstream jobs skip if an upstream job fails, unless `if: always()` is used).
- What is an artifact?
  > An artifact is a file or collection of files produced by a job that can be **downloaded in a later job**. In this case, `build.txt` is uploaded via `actions/upload-artifact@v4` and downloaded in the `deploy` job via `actions/download-artifact@v4`. Artifacts enable data sharing between jobs without a shared filesystem.
- What is `outputs` used for?
  > `outputs` defines named values that a job can **pass to downstream jobs**. Here, `version` (a generated git tag) is output so other jobs can reference it via `${{ needs.build.outputs.version }}`. This is the standard mechanism for inter-job data passing in GitHub Actions.

---

## Exercise 4: PR-Triggered Pipeline

**Goal:** Create a pipeline that only runs on pull requests and adds status checks.

### `.github/workflows/pr-checks.yml`

```yaml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  pr-checks:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write  # Required to post comments

    steps:
      - uses: actions/checkout@v4

      - name: Check PR title
        run: |
          TITLE="${{ github.event.pull_request.title }}"
          echo "PR Title: $TITLE"
          if [ ${#TITLE} -lt 10 ]; then
            echo "ERROR: PR title too short (min 10 characters)"
            exit 1
          fi

      - name: Check for required files
        run: |
          if [ ! -f "README.md" ]; then
            echo "WARNING: No README.md found"
          else
            echo "README.md found"
          fi

      - name: Simulate code review checks
        run: |
          echo "Running security scan..."
          echo "Running code quality check..."
          echo "All checks passed!"

      - name: Post PR comment
        run: |
          echo "✅ CI checks passed for PR #${{ github.event.pull_request.number }}"
```

---

## Exercise 5: Matrix Build Pipeline

**Goal:** Test across multiple Node.js versions and operating systems simultaneously.

### `.github/workflows/matrix.yml`

```yaml
name: Matrix Build

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]
        os: [ubuntu-latest, windows-latest]
        exclude:
          # Skip Node 22 on Windows if not needed
          - os: windows-latest
            node-version: 22.x

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }} on ${{ matrix.os }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
```

---

## Quick Reference: GitHub Actions YAML

```yaml
# Top-level keys
name: Workflow Name           # Display name in Actions tab
on:                           # Triggers
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Jobs
jobs:
  job-name:                   # Unique job ID
    runs-on: ubuntu-latest    # Runner
    permissions: ...          # Permissions (optional)
    outputs: ...              # Job outputs (for passing between jobs)
    steps:
      - name: Step name        # Step display name
        uses: action@version  # Use a pre-built action
        with:                 # Action inputs
          key: value
      - run: echo "Hello"     # Run a shell command
        shell: bash           # Shell to use
      - name: Set env var
        run: echo "BUILD=123" >> $GITHUB_ENV
      - name: Conditional step
        if: github.ref == 'refs/heads/main'
        run: echo "On main branch!"
```

## Common Triggers

| Trigger | Description |
|---------|-------------|
| `push` | On code push |
| `pull_request` | On PR open/update |
| `schedule` | Cron-based (e.g., `0 0 * * *`) |
| `workflow_dispatch` | Manual trigger |
| `release` | On GitHub release |
| `push tags` | When a tag is pushed |

## Common Actions

| Action | Purpose |
|--------|---------|
| `actions/checkout@v4` | Clone repo |
| `actions/setup-node@v4` | Setup Node.js |
| `actions/setup-python@v4` | Setup Python |
| `actions/upload-artifact@v4` | Upload files |
| `actions/download-artifact@v4` | Download files |
| `azure/login@v2` | Login to Azure |
| `azure/webapps-deploy@v4` | Deploy to Azure App Service |

---

## Running Your Pipelines Locally

To test YAML syntax before pushing:
```bash
# Install act (GitHub Actions runner locally)
# https://github.com/nektos/act

# Run the default workflow
act

# Run a specific workflow
act -W .github/workflows/hello.yml
```

---

## Bonus Challenges

1. **Add a badge:** Add a CI status badge to your README:
   ```md
   ![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/hello.yml/badge.svg)
   ```

2. **Add environment variables:** Store secrets in GitHub Settings → Secrets and use them in your pipeline.

3. **Schedule a pipeline:** Add a nightly build that runs at midnight every day.

4. **Add Slack notifications:** Use `slackapi/slack-github-action` to post to Slack on failure.

5. **Deploy to Azure:** Add a deploy job that pushes a Docker image to Azure Container Registry and deploys to Azure App Service.
