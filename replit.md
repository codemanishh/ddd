# TableServe - Restaurant Management System

## Overview
A comprehensive restaurant management application designed for pubs and bars to manage food and beverage orders, table management, billing, and sales analytics.

## Technology Stack
- **Frontend**: React.js with TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based with bcrypt password hashing

## Demo Credentials
- **Admin URL**: `/admin/demo`
- **Password**: `demo123`
- **Customer Menu**: `/user/demo/menu`

## Super Admin Credentials
- **Super Admin URL**: `/superadmin/codemanishh`
- **Password**: `MAPA78manisH#@Tablebooking`

## Key Features
- Multi-restaurant support with unique URLs (`/admin/{admin_uid}`)
- Customer ordering interface (`/user/{admin_uid}/menu`)
- Real-time table management with status indicators
- Order management with accept/reject/process workflow
- Automated billing with discounts and service charges
- Sales analytics and reporting
- Email-based password recovery
- **Super Admin Panel** (`/superadmin/{super_admin_uid}`) - Manage all restaurants, onboard new ones, edit/delete restaurants

## Project Structure
```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── lib/          # Context and utilities
│   │   └── hooks/        # Custom React hooks
├── server/               # Express backend
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   └── db.ts             # Database connection
├── shared/               # Shared types and schemas
│   └── schema.ts         # Drizzle ORM schema
├── script/               # Utility scripts
│   ├── build.ts          # Build script
│   └── seed-demo.ts      # Demo data seeding
```

## URL Structure
- `/` - Home page with demo links
- `/admin/{admin_uid}` - Admin login page
- `/admin/{admin_uid}/dashboard` - Admin dashboard (table management)
- `/admin/{admin_uid}/orders` - Order management
- `/admin/{admin_uid}/menu` - Menu management
- `/admin/{admin_uid}/billing` - Billing system
- `/admin/{admin_uid}/analytics` - Sales analytics
- `/admin/{admin_uid}/settings` - Restaurant settings
- `/user/{admin_uid}/menu` - Customer menu and ordering
- `/user/{admin_uid}/orders` - Customer order tracking

## Menu Categories
1. **Veg**: Starters, Main Course
2. **Non-Veg**: Starters, Main Course
3. **Cake**: Pastries, Dessert Cakes, Custom Cakes
4. **Liquor**: Whisky, Rum, Vodka, Gin, Beer, Wine, IMFL, Country Liquor
5. **Drinks**: Soft Drinks, Water, Juices, Mocktails, Tea/Coffee

## Database Tables
- `restaurants` - Restaurant admin accounts
- `menu_items` - Menu items with categories
- `tables` - Table status management
- `orders` - Customer orders
- `bills` - Generated bills
- `sales_history` - Sales records
- `auth_tokens` - Authentication tokens
- `super_admins` - Super admin accounts

## Order Workflow
1. **Pending** - Customer placed order, awaiting admin review
2. **Accepted** - Admin accepted the order
3. **Processing** - Order is being prepared
4. **Completed** - Order is ready/served
5. **Rejected** - Admin rejected the order

## Table Status
- **Vacant** (Gray) - Table is available
- **Active** (Green) - Customer is ordering
- **Billing** (Yellow) - Bill generated, awaiting payment

## Development Commands
- `npm run dev` - Start development server
- `npm run db:push` - Push database schema changes
- `npm run build` - Build for production
- `npx tsx script/seed-demo.ts` - Seed demo restaurant data

## Email Integration
- Uses **Maileroo** for sending password reset emails
- API key stored in `MAILEROO_API_KEY` secret
- Domain: `4907f590a2ca0174.maileroo.org`
- Emails sent from: `noreply@4907f590a2ca0174.maileroo.org`
- Free tier: 3,000 emails/month - can send to any email address

## Recent Changes
- December 15, 2025: Added Bill History feature in Billing page - view all completed bills with day/week/month/year filters, click any bill to see details and download PDF
- December 15, 2025: Redesigned bill PDF with professional look - purple header, styled tables, rounded boxes, and UPI QR code now appears on all bills (not just UPI payments) when configured in settings
- December 15, 2025: Added India-focused analytics: Payment Mode breakdown (UPI/Cash/Card), Category Revenue (Food/Liquor/Beverages/Desserts), GST Summary (CGST+SGST), and Period Comparison with growth indicators
- December 15, 2025: Added payment mode tracking to billing system (UPI, Cash, Card, Others)
- December 15, 2025: Enhanced Analytics page with Quick Actions, Time-Based Analytics (peak hours, day performance), Financial Breakdown (discounts, service charges), Customer Analytics (avg items/order, popular combos, table turnover)
- December 15, 2025: Added Cancel Table feature for admin dashboard - allows cancelling all orders and resetting table to vacant
- December 15, 2025: Fixed Place Order UX - now shows table entry dialog instead of error when not logged in
- December 15, 2025: Switched to Maileroo for password reset emails - can send to any restaurant email without domain verification
- December 15, 2025: Integrated Resend for password reset emails - now actually sends emails
- December 14, 2025: Added OTP refresh button on dashboard - admin can regenerate OTP for vacant tables only
- December 14, 2025: Modernized UI with purple/violet color scheme and card shadow effects
- December 14, 2025: Added OTP verification for table access - customers must enter a 4-digit OTP (shown on admin dashboard) to join a table. OTP regenerates when table is reset.
- December 14, 2025: Added real-time table session validation - customers are automatically redirected when admin resets their table
- December 14, 2025: Added table activity notifications for admin dashboard - toast notifications and "NEW" badge when customers join tables
- December 13, 2025: Initial setup and database migration
- Demo restaurant "The Golden Pub" created with 23 sample menu items
- Full authentication system with JWT tokens
- Complete order and billing workflow
