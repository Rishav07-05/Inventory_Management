# 🧪 Lab & Chemical Inventory Management System

An enterprise-grade, role-based Web application built using Next.js, Prisma, PostgreSQL (Neon DB), and Clerk authentication. The system handles lab inventory management, chemical/equipment tracking, multi-seller workflows, and quotation/purchase order lifecycle management.

---

## ✨ Features

### 👤 Role-Based Capabilities

#### 🛡️ Administrator Dashboard
- **Comprehensive Overview**: Real-time sales trends, revenue analytics, category-wise distributions, and system-wide safety stock alerts.
- **Inventory Control**: Full CRUD capabilities for products, categories, and stock thresholds.
- **System Integrity**: View read-only system-wide **Audit Logs** for tracking modifications, status transitions, and stock operations.
- **Workflow Operations**: Ability to override, approve, cancel, or modify any quotation/purchase order.

#### 🏪 Seller Operations
- **Product Listing**: List and manage their own products, update available quantities, and modify units.
- **Order Pipeline**: Track and process purchase orders containing their products. Can approve orders (allocating stock) or cancel them.
- **Data Isolation**: Strict data segregation ensuring sellers see only their own items, prices, and totals inside shared orders.
- **Assisted Deals & Quotations**: Manage customer quotations, draft quotations, and convert them to live purchase orders.

#### 🛒 Buyer Portal
- **Interactive Catalog**: Browse lab chemicals and equipment with advanced filtering by category, search, and stock status.
- **Shopping Cart**: Build multi-seller orders and submit them as purchase orders.
- **Quotation Requests**: Request tailored price quotes for bulk items and track approval progress.
- **Order History**: Track past order statuses (`PENDING`, `APPROVED`, `SHIPPED`, etc.).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- **Database**: [PostgreSQL (Neon DB)](https://neon.tech/)
- **ORM**: [Prisma Client](https://www.prisma.io/)
- **Authentication**: [Clerk](https://clerk.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Visuals & Icons**: [Lucide React](https://lucide.dev/)
- **Charts & Data Viz**: [Recharts](https://recharts.org/)
- **State Management**: React Context & Hooks

---

## 📁 Repository Structure

```text
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   └── seed.ts                # Database seed script
├── src/
│   ├── app/
│   │   ├── actions/
│   │   │   └── business.ts    # Server actions for business logic & authorization
│   │   ├── admin/             # Admin dashboard, inventory & log pages
│   │   ├── buyer/             # Buyer catalog, cart & checkout pages
│   │   ├── seller/            # Seller dashboard, product & order pages
│   │   ├── onboarding/        # First-time user setup
│   │   ├── sign-in/           # Clerk authentication wrappers
│   │   ├── unauthorized/      # Fallback page for RBAC checks
│   │   ├── layout.tsx         # Global app wrap
│   │   └── page.tsx           # Entrypoint / redirect route
│   ├── components/            # Reusable UI components (charts, tables, managers)
│   ├── lib/
│   │   ├── db.ts              # Prisma database client
│   │   └── decimal.ts         # Math library for high-precision currency values
│   └── middleware.ts          # Clerk route protection & RBAC middleware
├── .env.local                 # Local environment configuration
└── package.json               # Package dependencies & build configuration
```

---

## 🚀 Getting Started

### 📋 Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v20.0.0 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### 🔧 Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Rishav07-05/Inventory_Management.git
   cd Inventory_Management
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file at the root of the project and populate it with your credentials (see [Environment Variables](#-environment-variables) below).

4. **Initialize Database Schema**
   Push the Prisma schema to your PostgreSQL instance:
   ```bash
   npx prisma db push
   ```

5. **Seed the Database** (Optional)
   Pre-populate the database with categories, default products, and test accounts:
   ```bash
   npx prisma db seed
   ```

6. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🔒 Environment Variables

Provide these variables in your deployment dashboard or `.env.local` file:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (supports Neon pooled connections). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable API key for frontend authentication. |
| `CLERK_SECRET_KEY` | Clerk secret API key for backend operations. |
| `NEXT_PUBLIC_APP_URL` | The base URL of the app (e.g. `http://localhost:3000` or production domain). |
| `NEXT_PUBLIC_MOCK_AUTH` | Set to `true` to bypass Clerk and use local cookie mock authentication, or `false` for production. |
| `ADMIN_EMAIL` | Credentials used for setting up the initial admin user. |
| `ADMIN_PASS` | Password used for initial admin setup. |

---

## 🌐 Deployment to Vercel

This application is fully optimized for Vercel deployment:

1. **Connect Repository**: Import the repository in your Vercel Dashboard.
2. **Configure Environment Variables**: Enter all key-value pairs matching your `.env.local`.
3. **Next.js Turbopack build**: The project is pre-configured with a custom build script that handles database initialization at build time:
   ```json
   "build": "prisma generate && next build --turbopack"
   ```
4. **Peer Dependency Bypass**: A `.npmrc` file is included containing `legacy-peer-deps=true` to prevent dependency conflicts with newer React versions during the `npm install` phase.
