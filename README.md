# Restaurant Management Web Application

This project is a full-stack web application for managing restaurant operations, including reservations, table management, order taking, kitchen display, billing, and staff account management. It features a React frontend and a Node.js/Express backend with a PostgreSQL database, all containerized with Docker.

## Features (High-Level)

*   **Staff Authentication & Roles:** Secure login for different staff roles (Manager, Waiter, Cashier, Kitchen Staff).
*   **Reservation Management:** Customer-facing reservation requests and staff-side confirmation/management.
*   **Table & Seating Management:** Visual table layout (conceptual) and assignment for dining sessions.
*   **Order Taking & Processing:** Full order lifecycle from taking orders to kitchen preparation and serving.
*   **Kitchen Display System (KDS):** Real-time (via polling) view of orders for kitchen staff.
*   **Billing & Payment:** Generation of bills and confirmation of payments.
*   **Menu Management:** CRUD operations for menu items, including availability status.
*   **Staff Account Management:** Admin interface for managing staff accounts.
*   **Reporting:** Basic reporting features for managers.

## Technology Stack

*   **Frontend:** React (with Vite), Redux Toolkit, React Router DOM, Axios, Tailwind CSS
*   **Backend:** Node.js, Express.js, Prisma (ORM)
*   **Database:** PostgreSQL
*   **Development Environment:** Docker, Docker Compose

## Prerequisites

Before you begin, ensure you have the following installed on your system:

*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (which includes Docker Engine and Docker Compose)
*   [Node.js](https://nodejs.org/) (v18.x or later recommended, primarily for `npm create vite` if setting up the frontend from scratch, but Docker handles Node.js for the app itself)
*   [Git](https://git-scm.com/)

## Project Setup & Installation

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-project-directory-name>
    ```

2.  **Environment Configuration:**
    The backend requires environment variables for database connection and JWT secrets.
    *   Navigate to the `backend` directory: `cd backend`
    *   Create a `.env` file by copying the example (if one exists) or creating it manually:
        ```bash
        cp .env.example .env 
        ```
        (If `.env.example` doesn't exist, create `.env` with the following content)
    *   Edit `./backend/.env` and set your variables:
        ```env
        DATABASE_URL="postgresql://devuser:devpassword@db:5432/restaurant_db?schema=public"
        PORT=5000 # Port the backend container will listen on internally
        JWT_SECRET="YOUR_STRONG_RANDOM_JWT_SECRET_KEY_HERE" # Replace with a strong secret
        JWT_EXPIRES_IN="1h" # Or your preferred expiration
        # Add any other backend environment variables as needed
        ```
    *   **Important:** Ensure this `.env` file is listed in your root `.gitignore` file to prevent committing secrets.
    *   Navigate back to the project root: `cd ..`

    The frontend uses Vite environment variables (prefixed with `VITE_`). The main one (`VITE_API_URL`) is typically set in the `docker-compose.yml` file for the development environment.

3.  **Review `docker-compose.yml` (Optional but Recommended):**
    *   Open `docker-compose.yml` in the project root.
    *   Verify the service names (`frontend`, `backend`, `db`), ports, and volume mappings.
    *   For the **initial setup and dependency installation**, ensure the `command` lines for the `frontend` and `backend` services are **commented out**. This allows the containers to start so you can `exec` into them.

    Example snippet from `docker-compose.yml`:
    ```yaml
    # ...
    services:
      frontend:
        # ...
        # command: npm run dev -- --host --port 3000 # Keep commented for initial setup
        # ...
      backend:
        # ...
        # command: npm run dev # Keep commented for initial setup
        # ...
    ```

## Running the Application (First Time Setup)

These steps guide you through building the Docker images, installing dependencies inside the containers, and running initial database migrations and seeding.

1.  **Build and Start Docker Containers (Detached Mode):**
    From the project root directory:
    ```bash
    docker-compose up -d --build
    ```
    *   `--build`: Forces Docker to rebuild the images if there are changes.
    *   `-d`: Runs containers in detached mode.

2.  **Install Frontend Dependencies:**
    ```bash
    docker-compose exec frontend npm install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    docker-compose exec backend npm install
    ```
    *   *Ensure `bcryptjs` is listed as a dependency in `backend/package.json` if you plan to use the Prisma seed method for the admin account.* If not, add it:
        ```bash
        docker-compose exec backend npm install bcryptjs
        ```

4.  **Initialize Prisma, Run Migrations, and Seed Database (Backend):**
    *   **Initialize Prisma (if not already done):**
        ```bash
        docker-compose exec backend npx prisma init --datasource-provider postgresql
        ```
        *(This creates `prisma/schema.prisma` and updates `.env`. You should have your schema defined.)*

    *   **Run Migrations:** This applies your schema and creates tables.
        ```bash
        docker-compose exec backend npx prisma migrate dev --name initial-migration
        ```
    *   **Generate Prisma Client:**
        ```bash
        docker-compose exec backend npx prisma generate
        ```
    *   **Run Database Seed (to create the first admin if using seed method):**
        ```bash
        docker-compose exec backend npx prisma db seed
        ```
        *(This will execute the `prisma/seed.js` script if you configured it.)*

    *   **Alternative for First Admin (Using Register Endpoint):** If you prefer not to use Prisma seed for the first admin, the `POST /api/v1/auth/register` endpoint is designed to automatically assign the `MANAGER` role to the very first user registered if the `staff` table is empty. You can use Postman for this after migrations are run and *before* any other staff are created. See project documentation for more details on this method.

5.  **Stop the Containers:**
    ```bash
    docker-compose down
    ```

6.  **Enable Development Servers in `docker-compose.yml`:**
    *   Open `docker-compose.yml`.
    *   **Uncomment** the `command` lines for both `frontend` and `backend`.
    *   Save the file.

## Running the Application for Development (After Initial Setup)

1.  **Start Docker Containers:**
    From the project root directory:
    ```bash
    docker-compose up -d
    ```
    *(If you made changes to `package.json` files or Docker-related configurations, you might want to run `docker-compose up -d --build` again.)*

2.  **Access the Application:**
    *   **Frontend (React App):** Open your browser and navigate to `http://localhost:3718` (or the host port you mapped for the frontend service in `docker-compose.yml`).
    *   **Backend API:** Accessible at `http://localhost:5000` (or the host port you mapped for the backend service). You can test endpoints using tools like Postman.
        *   Health check: `GET http://localhost:5000/api/v1/health`

3.  **View Logs:**
    *   To see logs from all services: `docker-compose logs -f`
    *   For a specific service: `docker-compose logs -f frontend` or `docker-compose logs -f backend`

4.  **Stopping the Application:**
    ```bash
    docker-compose down
    ```
    *   To remove volumes (database data, node_modules - use with caution): `docker-compose down -v`

## Backend API Endpoints

The backend exposes RESTful APIs for resources such as:
*   `/api/v1/auth` (login, register)
*   `/api/v1/staff` (staff management by admin)
*   `/api/v1/menu-items`
*   `/api/v1/tables`
*   `/api/v1/reservations`
*   `/api/v1/dining-sessions`
*   `/api/v1/dining-sessions/:sessionId/orders`
*   `/api/v1/orders/:orderId`
*   `/api/v1/order-items/:orderItemId`
*   `/api/v1/dining-sessions/:sessionId/bill`
*   `/api/v1/bills/:billId`
*   `/api/v1/reports`

Refer to the route definitions in `./backend/src/routes/` for detailed paths and methods.

## Project Structure (Brief Overview)

```
my-restaurant-app/
├── backend/
│   ├── prisma/               # Prisma schema and migrations
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js         # Express app entry point
│   ├── .env                  # Environment variables (GITIGNORED!)
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/         # API client
│   │   ├── store/            # Redux store and slices
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx          # React app entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
├── docker-compose.yml
└── README.md
```