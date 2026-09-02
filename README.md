# 🥗 Nutri-Scale Backend

This project is a **NestJS** (Node.js) backend application written in **TypeScript**. It allows users to scan or upload PDFs containing recipes, extracts the data from them, and stores it in a database for quick access. Additionally, it provides functionality to scale meal portions and adjust macronutrients accordingly.

The project uses **pnpm** for package management.

---

## ✨ Features

* Upload or scan PDF files containing recipes.
* Extract recipe data automatically from PDFs.
* Store extracted recipes in a database.
* Scale recipes for different portion sizes.
* Adjust macronutrients according to scaled portions.

---

## 🛠️ Tech Stack

### Application Core
* **Framework:** [NestJS](https://nestjs.com/)
* **Language:** TypeScript
* **Database:** Any supported by TypeORM / Prisma (depending on your setup)
* **Package Manager:** [pnpm](https://pnpm.io/)

### DevOps & Infrastructure
* **Cloud Provider:** AWS EC2 (Ubuntu)
* **Containerization:** Docker, Docker Hub
* **Web Server & Reverse Proxy:** Nginx
* **Security & SSL:** Let's Encrypt (Certbot)
* **CI/CD Pipeline:** GitHub Actions
* **DNS Management:** AWS Route 53
* **Email Service:** Resend API

---

## 🚀 Deployment & Cloud Architecture

This project utilizes a modern approach to deployment, relying on containerization, AWS cloud infrastructure, and full CI/CD automation via GitHub Actions.

### 📦 Deployment Process (Step-by-Step)

The application build and hosting process is divided into several key stages:

### 1. Containerization (Docker)
* The application (Node.js/NestJS) is containerized using a `Dockerfile`.
* The built image ensures runtime consistency across environments, eliminating the *"it works on my machine"* problem.

### 2. Cloud Infrastructure Setup (AWS EC2)
* The application is hosted on an **AWS EC2** virtual instance running Ubuntu.
* **Security Groups** were strictly configured to open only the necessary ports: `22` (SSH), `80` (HTTP), and `443` (HTTPS) to maintain server security.
* Docker engine and Nginx were provisioned on the host machine.

### 3. Reverse Proxy & SSL Certificates (Nginx + Certbot)
* **Nginx** is configured as a Reverse Proxy, intercepting external traffic and securely routing it to the internal Docker container running on port `8000`.
* **Certbot (Let's Encrypt)** was used to provision and deploy SSL certificates, ensuring fully encrypted HTTPS connections for the `nutri-scale-be.wownek.pl` domain.
* The server automatically handles background certificate renewals and enforces HTTP to HTTPS redirects.

### 4. CI/CD Automation (GitHub Actions)
A fully automated pipeline is triggered on every push to the `main` branch:
* **Test & Build:** Verifies code integrity and installs dependencies using `pnpm`.
* **Docker Push:** Builds the latest Docker image and pushes it to the container registry (Docker Hub).
* **Deploy via SSH:** Securely connects to the AWS EC2 instance (using `appleboy/ssh-action`), pulls the latest image (`docker pull`), stops the old container, and spins up the new version while safely injecting environment variables from a hidden `.env` file.

### 5. External Services & DNS (Route 53 & Resend)
* The `nutri-scale-be` subdomain is routed through **AWS Route 53** using `A` records pointing to the EC2 elastic IP.
* The **Resend** email service is integrated for transactional emails. The domain was authenticated by configuring DKIM, SPF, MX, and DMARC records in Route 53, guaranteeing high deliverability and preventing emails from being flagged as spam.

---

## 💻 Installation & Local Setup

1. Clone the repository:
```bash
git clone <repository_url>
cd <project_folder>
```

Install dependencies:

Bash
pnpm install
Set up environment variables. Create a .env file in the root directory and add your configuration, for example:

Fragment kodu
DATABASE_URL=postgres://user:password@localhost:5432/recipes
PORT=3000
Run database migrations (if using TypeORM/Prisma):

Bash
pnpm run migrate
🏃‍♂️ Running the Application
To start the server in development mode:

Bash
pnpm run start:dev
The API will be available at: http://localhost:3000  

📡 API Endpoints  
Example endpoints — adjust according to your actual implementation.  

POST /recipes/upload - Upload a PDF and extract recipe data.  

GET /recipes - Retrieve all stored recipes.  

GET /recipes/:id - Retrieve a specific recipe by ID.  

POST /recipes/:id/scale - Scale recipe portions and adjust macronutrients.

🤝 Contributing
Fork the repository.

Create a feature branch: git checkout -b feature/my-feature

Commit your changes: git commit -m 'Add some feature'

Push to the branch: git push origin feature/my-feature

Create a pull request.  

📄 License  
This project is licensed under the MIT License.
