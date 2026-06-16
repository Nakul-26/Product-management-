# Retail ERP

A comprehensive, full-stack Retail Enterprise Resource Planning (ERP) application designed to streamline daily shop operations. It handles product inventory, barcode scanning, Point of Sale (POS) billing, purchases, expenses, and provides an analytical dashboard to track overall business performance.

## 🚀 Features

*   **Dashboard Analytics:** Real-time metrics including Total Revenue, COGS (Cost of Goods Sold), Gross/Net Profit, and low stock alerts. Features a visual revenue chart and a table of top profitable products.
*   **Point of Sale (POS):** Fast and intuitive billing interface with real-time cart calculation, tax (GST) handling, and custom discounts.
*   **Inventory & Product Management:** Full CRUD capabilities for products. Track SKU, barcodes, pricing, and precise stock levels. 
*   **Categories Management:** Organize products into a hierarchy with parent/child category relationships.
*   **Purchases Module:** Record stock intake from suppliers. Adding a purchase automatically updates the current inventory stock levels and calculates COGS.
*   **Barcode Scanner Integration:** Use a device camera or external scanner to quickly add products to the POS cart or look up product details.
*   **Expenses Tracking:** Log operational costs (rent, utilities, salaries) to accurately calculate Net Profit on the dashboard.
*   **Authentication & Roles:** Secure JWT-based login with role-based access control (`owner` vs `staff`).

## 🛠️ Technology Stack

**Frontend:**
*   **Framework:** React with TypeScript (Vite)
*   **Routing:** Custom lightweight routing logic
*   **Styling:** Custom Vanilla CSS with a modern, responsive design system
*   **Scanner:** `html5-qrcode` for camera-based barcode scanning

**Backend:**
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** MongoDB via Mongoose (ODM)
*   **Authentication:** JWT (JSON Web Tokens) and crypto-based password hashing

## 📦 Quick Start & Setup

### Prerequisites
*   Node.js (v18+)
*   MongoDB Instance (Local or Atlas)

### 1. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the root of the project (or inside `backend/`) based on `.env.example`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/retail_erp
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=604800
```

**Seed Demo Data:**
To populate the database with demo users, categories, and products:
```bash
npx ts-node src/scripts/seed.ts
```

*Demo Credentials created:*
*   Admin: `admin@example.com` / `password123`
*   Staff: `staff@example.com` / `password123`

**Start Backend Server:**
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will typically run on `http://localhost:5173`. 
*(Ensure your API base URL in `frontend/src/api/api.ts` points to your backend port, usually `http://localhost:5000/api`)*

## 🎨 Recent UI/UX Enhancements

The application recently underwent a significant UI polish to make it presentation-ready:
*   **Modern Typography & Spacing:** Transitioned to the `Inter` font family with an updated, high-contrast color palette.
*   **Responsive Layouts:** Implemented strict two-column desktop layouts for complex forms (Products, Categories, Purchases) that degrade gracefully to stacked mobile layouts.
*   **Visual Feedback:** Added dynamic status pills (Active/Inactive), warning states for low inventory, and consistent SVG iconography across action buttons.
*   **Polished Navigation:** A clean, sticky header on desktop with a fully functional hamburger drawer menu for mobile devices.
*   **Unified Forms:** Standardized inputs, dropdowns, and text areas with consistent padding, borders, and modern focus rings.

## 📄 License

This project is licensed under the MIT License.

