import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Restaurants table (Admin accounts)
export const restaurants = pgTable("restaurants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUid: text("admin_uid").notNull().unique(),
  password: text("password").notNull(),
  restaurantName: text("restaurant_name").notNull(),
  address: text("address"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  gstNumber: text("gst_number"),
  upiId: text("upi_id"),
  tableCount: integer("table_count").notNull().default(10),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  menuItems: many(menuItems),
  tables: many(tables),
  orders: many(orders),
  bills: many(bills),
  salesHistory: many(salesHistory),
}));

// Menu Items table
export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUid: text("admin_uid").notNull(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(), // 'veg', 'nonveg', 'cake', 'liquor', 'drinks'
  subcategory: text("subcategory"), // 'starters', 'main_course', 'whisky', etc.
  description: text("description"),
  imageUrl: text("image_url"),
  ingredients: text("ingredients").array(),
  calories: integer("calories"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [menuItems.adminUid],
    references: [restaurants.adminUid],
  }),
}));

// Tables table
export const tables = pgTable("tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUid: text("admin_uid").notNull(),
  tableNumber: integer("table_number").notNull(),
  status: text("status").notNull().default("vacant"), // 'vacant', 'active', 'billing'
  activeSessionId: text("active_session_id"),
  otp: text("otp").notNull().default("0000"), // 4-digit OTP for table verification
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tablesRelations = relations(tables, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [tables.adminUid],
    references: [restaurants.adminUid],
  }),
}));

// Order item type for JSON storage
export const orderItemSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  price: z.string(),
  quantity: z.number(),
  status: z.enum(['pending', 'accepted', 'processing', 'completed', 'rejected']),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUid: text("admin_uid").notNull(),
  sessionId: text("session_id").notNull(),
  tableNumber: integer("table_number").notNull(),
  items: jsonb("items").$type<OrderItem[]>().notNull(),
  orderStatus: text("order_status").notNull().default("active"), // 'active', 'completed', 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ordersRelations = relations(orders, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [orders.adminUid],
    references: [restaurants.adminUid],
  }),
}));

// Bill item type for JSON storage
export const billItemSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  price: z.string(),
  quantity: z.number(),
});

export type BillItem = z.infer<typeof billItemSchema>;

// Bills table
export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  billNumber: text("bill_number").notNull().unique(),
  adminUid: text("admin_uid").notNull(),
  sessionId: text("session_id").notNull(),
  tableNumber: integer("table_number").notNull(),
  items: jsonb("items").$type<BillItem[]>().notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  serviceChargePercentage: decimal("service_charge_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  serviceChargeAmount: decimal("service_charge_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").default("cash"), // 'cash', 'upi', 'card', 'wallet'
  generatedAt: timestamp("generated_at").defaultNow(),
  isFinal: boolean("is_final").notNull().default(false),
});

export const billsRelations = relations(bills, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [bills.adminUid],
    references: [restaurants.adminUid],
  }),
}));

// Sales item type for JSON storage
export const salesItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  price: z.string(),
});

export type SalesItem = z.infer<typeof salesItemSchema>;

// Sales History table
export const salesHistory = pgTable("sales_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUid: text("admin_uid").notNull(),
  billId: text("bill_id").notNull(),
  tableNumber: integer("table_number").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  itemsSold: jsonb("items_sold").$type<SalesItem[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Super Admins table
export const superAdmins = pgTable("super_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  superAdminUid: text("super_admin_uid").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Auth Tokens table
export const authTokens = pgTable("auth_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  adminUid: text("admin_uid").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [authTokens.adminUid],
    references: [restaurants.adminUid],
  }),
}));

export const salesHistoryRelations = relations(salesHistory, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [salesHistory.adminUid],
    references: [restaurants.adminUid],
  }),
  bill: one(bills, {
    fields: [salesHistory.billId],
    references: [bills.id],
  }),
}));

// Insert schemas
export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resetToken: true,
  resetTokenExpiry: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTableSchema = createInsertSchema(tables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  generatedAt: true,
});

export const insertSalesHistorySchema = createInsertSchema(salesHistory).omit({
  id: true,
  createdAt: true,
});

export const insertAuthTokenSchema = createInsertSchema(authTokens).omit({
  id: true,
  createdAt: true,
});

export const insertSuperAdminSchema = createInsertSchema(superAdmins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type Table = typeof tables.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;

export type SalesHistory = typeof salesHistory.$inferSelect;
export type InsertSalesHistory = z.infer<typeof insertSalesHistorySchema>;

export type AuthToken = typeof authTokens.$inferSelect;
export type InsertAuthToken = z.infer<typeof insertAuthTokenSchema>;

export type SuperAdmin = typeof superAdmins.$inferSelect;
export type InsertSuperAdmin = z.infer<typeof insertSuperAdminSchema>;

// Auth schemas
export const loginSchema = z.object({
  adminUid: z.string().min(1, "Admin UID is required"),
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordRequestSchema = z.object({
  adminUid: z.string().min(1, "Admin ID is required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Super Admin auth schema
export const superAdminLoginSchema = z.object({
  superAdminUid: z.string().min(1, "Super Admin ID is required"),
  password: z.string().min(1, "Password is required"),
});

export type SuperAdminLoginInput = z.infer<typeof superAdminLoginSchema>;

// Category definitions
export const menuCategories = [
  { value: 'veg', label: 'Veg' },
  { value: 'nonveg', label: 'Non-Veg' },
  { value: 'cake', label: 'Cake' },
  { value: 'liquor', label: 'Liquor' },
  { value: 'drinks', label: 'Drinks' },
] as const;

export const subcategories = {
  veg: ['starters', 'main_course'],
  nonveg: ['starters', 'main_course'],
  cake: ['pastries', 'dessert_cakes', 'custom_cakes'],
  liquor: ['whisky', 'rum', 'vodka', 'gin', 'beer', 'wine', 'imfl', 'country_liquor'],
  drinks: ['soft_drinks', 'water', 'juices', 'mocktails', 'tea_coffee'],
} as const;

export const subcategoryLabels: Record<string, string> = {
  starters: 'Starters',
  main_course: 'Main Course',
  pastries: 'Pastries',
  dessert_cakes: 'Dessert Cakes',
  custom_cakes: 'Custom Cakes',
  whisky: 'Whisky',
  rum: 'Rum',
  vodka: 'Vodka',
  gin: 'Gin',
  beer: 'Beer',
  wine: 'Wine',
  imfl: 'IMFL',
  country_liquor: 'Country Liquor',
  soft_drinks: 'Soft Drinks',
  water: 'Water',
  juices: 'Juices',
  mocktails: 'Mocktails',
  tea_coffee: 'Tea/Coffee',
};
