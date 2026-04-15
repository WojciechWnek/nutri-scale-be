# Nutri-Scale

This project is a **NestJS** (Node.js) backend application written in **TypeScript**. It allows users to scan or upload PDFs containing recipes, extracts the data from them, and stores it in a database for quick access. Additionally, it provides functionality to scale meal portions and adjust macronutrients accordingly.

The project uses **pnpm** for package management.

---

## Features

- Upload or scan PDF files containing recipes.
- Extract recipe data automatically from PDFs.
- Store extracted recipes in a database.
- Scale recipes for different portion sizes.
- Adjust macronutrients according to scaled portions.

---

## Tech Stack

- **Framework:** [NestJS](https://nestjs.com/)
- **Language:** TypeScript
- **Database:** Any supported by TypeORM / Prisma (depending on your setup)
- **Package Manager:** [pnpm](https://pnpm.io/)

---

## Installation

1. Clone the repository:

```bash
git clone <repository_url>
cd <project_folder>
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

Create a `.env` file in the root directory and add your configuration, for example:

```env
DATABASE_URL=postgres://user:password@localhost:5432/recipes
PORT=3000
```

4. Run database migrations (if using TypeORM/Prisma):

```bash
pnpm run migrate
```

---

## Running the Application

To start the server in development mode:

```bash
pnpm run start:dev
```

The API will be available at: `http://localhost:3000`

---

## API Endpoints

> Example endpoints — adjust according to your actual implementation.

- `POST /recipes/upload` - Upload a PDF and extract recipe data.
- `GET /recipes` - Retrieve all stored recipes.
- `GET /recipes/:id` - Retrieve a specific recipe by ID.
- `POST /recipes/:id/scale` - Scale recipe portions and adjust macronutrients.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Create a pull request.

---

## License

This project is licensed under the MIT License.
