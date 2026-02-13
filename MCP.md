# Model Context Protocol (MCP) Template

## 1. Project Overview

- **Project Name:** Planify
- **Purpose:** Financial planning & budgeting dashboard, with todo list and plan management features.
- **Target:** Local application, easy migration to online deployment.

## 2. Stack & Tools

- **Frontend:** Next.js (latest & LTS), TypeScript
- **SPA:** Application is designed as a Single Page Application (SPA) for smooth client-side navigation
- **Backend:** Next.js API routes
- **Database:** SQLite (local), easy migration to PostgreSQL/MySQL
- **ORM:** Prisma
- **UI Library:** Material UI / Chakra UI / Tailwind CSS

## 3. Project Structure

```
planify/
│
├─ src/
│   ├─ pages/
│   │   ├─ index.tsx
│   │   └─ api/
│   │       └─ ...
│   ├─ components/
│   └─ ...
├─ public/
├─ prisma/
│   └─ schema.prisma
├─ package.json
├─ tsconfig.json
├─ .env
├─ README.md
├─ MCP.md
```

## 4. Prompting & Development Guidelines

- **Language:** English (primary)
- **Code style:** TypeScript, clean code, modular
- **Prompting:** Clearly explain goals, features, and stack
- **UI:** All styling must use Tailwind CSS for consistency and maintainability
- **Agent Mode:** If running in agent mode, errors should be fixed automatically without additional confirmation.

## 5. Deployment & Migration

- **Local:** SQLite
- **Online:** PostgreSQL (cloud), migration via Prisma
- **Frontend:** Deploy to Vercel/Netlify
- **Backend:** Deploy to Vercel/Node hosting

## 6. Additional Notes

- Backup the database regularly
- Document setup and usage
- Iterative development plan (MVP, additional features)
- Unit testing is mandatory for backend (e.g., Jest)

---

## 6a. Environment Variables Example

Example .env file:

```
DATABASE_URL="file:./dev.db"
```

---

## 6b. Testing Guideline

- Write unit tests for backend logic and API routes
- Use Jest for test coverage

---

## 6c. Code Review & Contribution

- Follow code review and contribution guidelines for team collaboration
- Use pull requests and review before merging

---

## 7. Setup Project

### Project Initialization

- `npx create-next-app@latest . --typescript --tailwind`
- Install Material UI: `npm install @mui/material @emotion/react @emotion/styled`
- Install Prisma & SQLite: `npm install prisma @prisma/client sqlite3`
- Initialize Prisma: `npx prisma init`
- Setup database schema in `prisma/schema.prisma`
- Run migration: `npx prisma migrate dev --name init`
- Generate Prisma client: `npx prisma generate`
- Install Jest: `npm install --save-dev jest ts-jest @types/jest`
- Initialize Jest: `npx ts-jest config:init`
- Refactor jest.config.js to best practice (ES module, assign object to variable)
- Install ESLint: `npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser`
- Configure ESLint as needed

### Project Structure

- Main code in `src/` folder
- Use import alias `@/*` for easier imports

### Notes

- Ensure .env file contains DATABASE_URL
- dev.db will be created automatically during migration

---

## 8. MCP Placement Best Practice

It is best practice to keep the Model Context Protocol (MCP) documentation in the project root as `MCP.md`. This ensures all contributors and tools can easily reference project context, stack, and development guidelines. Update MCP.md whenever there are changes to stack, features, or workflow.

---
