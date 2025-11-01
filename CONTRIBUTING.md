# Contributing to Smart Home Energy Monitor

Thank you for considering contributing to this project! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Workflow](#development-workflow)
- [Style Guidelines](#style-guidelines)
- [Commit Convention](#commit-convention)

---

## 📜 Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code.

---

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear description** of the issue
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Screenshots** (if applicable)
- **Environment details:**
  - Node.js version
  - ESP32 board type
  - Browser (for frontend issues)

**Example:**
```markdown
### Bug: Dashboard not loading data

**Steps:**
1. Open dashboard at http://example.com
2. Select device "Room1"
3. Click "Generate Report"

**Expected:** Report shows data
**Actual:** Shows "No data found"

**Environment:**
- Node.js: v18.16.0
- Browser: Chrome 120
- AWS Region: ap-southeast-2
```

### Suggesting Features

Feature requests are welcome! Please include:

- **Use case** - Why is this needed?
- **Proposed solution** - How should it work?
- **Alternatives** - What other options did you consider?

---

## 🔧 Development Workflow

### 1. Fork & Clone

```bash
# Fork on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/smart-home-energy-monitor.git
cd smart-home-energy-monitor
```

### 2. Create Feature Branch

```bash
git checkout -b feature/amazing-feature
```

**Branch naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Adding tests

### 3. Make Changes

```bash
# Install dependencies
cd src-aws && npm install

# Run tests
npm test

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add user authentication"
```

### 5. Push & Create Pull Request

```bash
git push origin feature/amazing-feature
```

Then create a Pull Request on GitHub.

---

## 📐 Style Guidelines

### JavaScript/Node.js

Follow ESLint configuration (`.eslintrc.json`):

```javascript
// ✅ Good
const fetchData = async (deviceId) => {
    const result = await api.query(deviceId);
    return result.data;
};

// ❌ Avoid
const fetchData = async deviceId => {
  let result = await api.query(deviceId)
  return result.data
}
```

**Key rules:**
- Use `const` and `let`, never `var`
- 4-space indentation
- Single quotes for strings
- Semicolons required
- No trailing spaces

### C++ (ESP32)

```cpp
// ✅ Good
void measureElectricity(void* parameter) {
    for (;;) {
        double amps = emon1.calcIrms(2000);
        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }
}

// ❌ Avoid
void measureElectricity(void* parameter){
  for(;;){
    double amps=emon1.calcIrms(2000);
    vTaskDelay(1000/portTICK_PERIOD_MS);
  }
}
```

### Documentation

- Use Markdown for docs
- Add code examples where helpful
- Keep line length < 100 characters
- Use headers (#, ##, ###) for structure

---

## 📝 Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, no logic change)
- `refactor` - Code refactoring
- `test` - Adding/updating tests
- `chore` - Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat(dashboard): add export to PDF button"

# Bug fix
git commit -m "fix(mqtt): reconnect on connection loss"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api)!: change GraphQL schema for usageData"
```

### Scope (Optional)

- `dashboard` - Frontend changes
- `api` - Backend/GraphQL changes
- `hardware` - ESP32 firmware
- `docs` - Documentation
- `ci` - CI/CD changes

---

## 🧪 Testing

### Backend Tests

```bash
cd src-aws
npm test
```

**Add tests for:**
- New resolvers
- Helper functions
- Calculations (kWh, tariff)

**Example:**
```javascript
// tests/myFeature.test.js
const assert = require('assert');
const { myFunction } = require('../core/helpers');

describe('MyFeature', () => {
    it('should return correct value', () => {
        const result = myFunction(input);
        assert.equal(result, expected);
    });
});
```

### Hardware Tests

```bash
cd src-esp
pio test
```

---

## 🔍 Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**
4. **Run linter** and fix issues
5. **Update README.md** if adding features
6. **Link related issues** in PR description

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Linter passed
- [ ] Tested locally

## Screenshots (if applicable)

## Related Issues
Fixes #123
```

---

## 📚 Resources

- [Serverless Framework Docs](https://www.serverless.com/framework/docs/)
- [AWS IoT Core Docs](https://docs.aws.amazon.com/iot/)
- [ESP32 Arduino Docs](https://docs.espressif.com/projects/arduino-esp32/)
- [GraphQL Docs](https://graphql.org/learn/)

---

## 💬 Questions?

- **GitHub Issues** - For bugs and features
- **Email** - apiwit806@gmail.com
- **Discussions** - For general questions

---

Thank you for contributing! 🙏