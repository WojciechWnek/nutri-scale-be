# AGENTS.md

## Project Overview

This project is a **NestJS backend API** written in **TypeScript**.  
Its main goal is to allow users to upload or scan PDF files containing recipes, extract structured data using AI, and store recipes in a database for fast access.

The system also allows scaling meal portions and recalculating macronutrients.

Package manager: **pnpm**

---

## Main Responsibilities of the AI Agent

The AI agent working on this repository should:

- Maintain clean NestJS architecture and modular structure.
- Follow TypeScript best practices.
- Keep business logic inside services, not controllers.
- Ensure extracted recipe data is validated before saving.
- Avoid breaking existing API contracts.
- Write readable and maintainable code.

---

## Core Features

1. PDF upload and processing.
2. AI-based recipe data extraction.
3. Saving recipes to the database.
4. Scaling recipe portions.
5. Adjusting macronutrients based on scaling.

---

## Tech Stack

- NestJS
- TypeScript
- Node.js
- pnpm
- Database (Prisma or TypeORM depending on configuration)
- AI extraction service

---

## Project Architecture Rules

### NestJS Structure

The agent should respect standard NestJS layering:

- Controllers → handle HTTP layer only
- Services → business logic
- Modules → domain separation
- DTOs → validation and typing
- Entities/Models → database layer

Never place heavy logic inside controllers.

---

## Coding Guidelines

- Use strict TypeScript types.
- Prefer async/await over callbacks.
- Avoid `any` unless absolutely necessary.
- Keep functions small and composable.
- Follow existing naming conventions.

### File Naming

- `*.controller.ts`
- `*.service.ts`
- `*.module.ts`
- `*.dto.ts`

---

## AI Extraction Guidelines

When modifying extraction logic:

- Do not assume PDF structure is always consistent.
- Implement fallback parsing where possible.
- Validate extracted values before saving.
- Keep extraction logic isolated from HTTP layer.

---

## Database Rules

- Always use DTO validation before persistence.
- Do not introduce breaking schema changes without migrations.
- Prefer explicit typing for recipe models:
  - title
  - ingredients
  - instructions
  - macros
  - portions

---

## Scaling Logic

Scaling must:

- Adjust ingredient quantities proportionally.
- Recalculate macronutrients.
- Avoid mutating original recipe data directly.
- Return a new scaled object instead.

---

## API Conventions

Example endpoints:

- `POST /recipes/upload`
- `GET /recipes`
- `GET /recipes/:id`
- `POST /recipes/:id/scale`

Agent must keep endpoints RESTful and consistent.

---

## Error Handling

- Use NestJS exceptions.
- Never expose raw internal errors.
- Return structured error responses.

---

## Performance Considerations

- Avoid blocking operations in controllers.
- Heavy PDF or AI processing should be async.
- Prepare code to support queues/workers in future.

---

## Security Rules

- Validate file uploads.
- Never trust user input.
- Sanitize extracted data.

---

## What the Agent SHOULD NOT Do

- Do not rewrite the whole architecture.
- Do not introduce new frameworks without reason.
- Do not change package manager (pnpm).
- Do not hardcode secrets or API keys.
- Do not move business logic into controllers.

---

## Preferred Development Style

- Small focused commits.
- Clear function names.
- Predictable folder structure.
- Modular NestJS design.

---

## Goal of the Project

Provide a clean, scalable backend API that:

1. Extracts recipes from PDFs using AI.
2. Stores structured recipe data.
3. Allows flexible scaling of meals and macronutrients.

The AI agent should prioritize maintainability, readability, and scalability.
