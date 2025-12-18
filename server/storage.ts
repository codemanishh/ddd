import { eq, and, gte, lte, desc, lt } from "drizzle-orm";
import { db } from "./db";
import {
  restaurants,
  menuItems,
  tables,
  orders,
  bills,
  salesHistory,
  authTokens,
  superAdmins,
  type Restaurant,
  type InsertRestaurant,
  type MenuItem,
  type InsertMenuItem,
  type Table,
  type InsertTable,
  type Order,
  type InsertOrder,
  type OrderItem,
  type Bill,
  type InsertBill,
  type SalesHistory,
  type InsertSalesHistory,
  type AuthToken,
  type InsertAuthToken,
  type SuperAdmin,
  type InsertSuperAdmin,
} from "@shared/schema";

export interface IStorage {
  // Restaurant methods
  getRestaurantByAdminUid(adminUid: string): Promise<Restaurant | undefined>;
  getRestaurantByEmail(email: string): Promise<Restaurant | undefined>;
  getRestaurantByResetToken(token: string): Promise<Restaurant | undefined>;
  createRestaurant(data: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(adminUid: string, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;
  setResetToken(adminUid: string, token: string, expiry: Date): Promise<void>;
  clearResetToken(adminUid: string): Promise<void>;
  updatePassword(adminUid: string, hashedPassword: string): Promise<void>;

  // Menu Item methods
  getMenuItemsByAdminUid(adminUid: string): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(data: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<void>;

  // Table methods
  getTablesByAdminUid(adminUid: string): Promise<Table[]>;
  getTable(id: string): Promise<Table | undefined>;
  getTableByNumber(adminUid: string, tableNumber: number): Promise<Table | undefined>;
  createTable(data: InsertTable): Promise<Table>;
  updateTable(id: string, data: Partial<InsertTable>): Promise<Table | undefined>;
  resetTable(id: string): Promise<Table | undefined>;
  initializeTables(adminUid: string, count: number): Promise<void>;

  // Order methods
  getOrdersByAdminUid(adminUid: string): Promise<Order[]>;
  getActiveOrdersByAdminUid(adminUid: string): Promise<Order[]>;
  getOrdersBySessionId(sessionId: string): Promise<Order[]>;
  getActiveOrdersByTableNumber(adminUid: string, tableNumber: number): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(data: InsertOrder): Promise<Order>;
  updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined>;
  updateOrderItemStatus(orderId: string, itemIndex: number, status: OrderItem['status']): Promise<Order | undefined>;

  // Bill methods
  getBillsByAdminUid(adminUid: string): Promise<Bill[]>;
  getFinalizedBillsByAdminUid(adminUid: string): Promise<Bill[]>;
  getBillBySessionId(sessionId: string): Promise<Bill | undefined>;
  getBill(id: string): Promise<Bill | undefined>;
  createBill(data: InsertBill): Promise<Bill>;
  updateBill(id: string, data: Partial<InsertBill>): Promise<Bill | undefined>;
  getNextBillNumber(adminUid: string): Promise<string>;

  // Sales History methods
  getSalesHistoryByAdminUid(adminUid: string): Promise<SalesHistory[]>;
  getSalesHistoryByDateRange(adminUid: string, startDate: Date, endDate: Date): Promise<SalesHistory[]>;
  createSalesHistory(data: InsertSalesHistory): Promise<SalesHistory>;
  getTodaySales(adminUid: string): Promise<{ totalSales: number; orderCount: number }>;

  // Auth Token methods
  createAuthToken(data: InsertAuthToken): Promise<AuthToken>;
  getValidAuthToken(token: string): Promise<AuthToken | undefined>;
  deleteAuthToken(token: string): Promise<void>;
  deleteExpiredTokens(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Restaurant methods
  async getRestaurantByAdminUid(adminUid: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.adminUid, adminUid));
    return restaurant;
  }

  async getRestaurantByEmail(email: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.email, email));
    return restaurant;
  }

  async getRestaurantByResetToken(token: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.resetToken, token));
    return restaurant;
  }

  async createRestaurant(data: InsertRestaurant): Promise<Restaurant> {
    const [restaurant] = await db.insert(restaurants).values(data).returning();
    return restaurant;
  }

  async updateRestaurant(adminUid: string, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    const [restaurant] = await db
      .update(restaurants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(restaurants.adminUid, adminUid))
      .returning();
    return restaurant;
  }

  async setResetToken(adminUid: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(restaurants)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(restaurants.adminUid, adminUid));
  }

  async clearResetToken(adminUid: string): Promise<void> {
    await db
      .update(restaurants)
      .set({ resetToken: null, resetTokenExpiry: null })
      .where(eq(restaurants.adminUid, adminUid));
  }

  async updatePassword(adminUid: string, hashedPassword: string): Promise<void> {
    await db
      .update(restaurants)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(restaurants.adminUid, adminUid));
  }

  // Menu Item methods
  async getMenuItemsByAdminUid(adminUid: string): Promise<MenuItem[]> {
    return db.select().from(menuItems).where(eq(menuItems.adminUid, adminUid));
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createMenuItem(data: InsertMenuItem): Promise<MenuItem> {
    const [item] = await db.insert(menuItems).values(data).returning();
    return item;
  }

  async updateMenuItem(id: string, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [item] = await db
      .update(menuItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return item;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // Table methods
  async getTablesByAdminUid(adminUid: string): Promise<Table[]> {
    return db.select().from(tables).where(eq(tables.adminUid, adminUid));
  }

  async getTable(id: string): Promise<Table | undefined> {
    const [table] = await db.select().from(tables).where(eq(tables.id, id));
    return table;
  }

  async getTableByNumber(adminUid: string, tableNumber: number): Promise<Table | undefined> {
    const [table] = await db
      .select()
      .from(tables)
      .where(and(eq(tables.adminUid, adminUid), eq(tables.tableNumber, tableNumber)));
    return table;
  }

  async createTable(data: InsertTable): Promise<Table> {
    const [table] = await db.insert(tables).values(data).returning();
    return table;
  }

  async updateTable(id: string, data: Partial<InsertTable>): Promise<Table | undefined> {
    const [table] = await db
      .update(tables)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tables.id, id))
      .returning();
    return table;
  }

  generateOtp(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  async resetTable(id: string): Promise<Table | undefined> {
    const newOtp = this.generateOtp();
    const [table] = await db
      .update(tables)
      .set({ status: "vacant", activeSessionId: null, otp: newOtp, updatedAt: new Date() })
      .where(eq(tables.id, id))
      .returning();
    return table;
  }

  async regenerateTableOtp(id: string): Promise<Table | undefined> {
    const newOtp = this.generateOtp();
    const [table] = await db
      .update(tables)
      .set({ otp: newOtp, updatedAt: new Date() })
      .where(eq(tables.id, id))
      .returning();
    return table;
  }

  async verifyTableOtp(adminUid: string, tableNumber: number, otp: string): Promise<boolean> {
    const table = await this.getTableByNumber(adminUid, tableNumber);
    if (!table) return false;
    return table.otp === otp;
  }

  async initializeTables(adminUid: string, count: number): Promise<void> {
    const existingTables = await this.getTablesByAdminUid(adminUid);
    const existingNumbers = new Set(existingTables.map((t) => t.tableNumber));

    for (let i = 1; i <= count; i++) {
      if (!existingNumbers.has(i)) {
        const otp = this.generateOtp();
        await this.createTable({ adminUid, tableNumber: i, status: "vacant", otp });
      }
    }
  }

  async syncTables(adminUid: string, newCount: number): Promise<void> {
    const existingTables = await this.getTablesByAdminUid(adminUid);
    
    // Add missing tables (for increasing count)
    const existingNumbers = new Set(existingTables.map((t) => t.tableNumber));
    for (let i = 1; i <= newCount; i++) {
      if (!existingNumbers.has(i)) {
        const otp = this.generateOtp();
        await this.createTable({ adminUid, tableNumber: i, status: "vacant", otp });
      }
    }
    
    // Delete excess tables (for decreasing count)
    for (const table of existingTables) {
      if (table.tableNumber > newCount) {
        await db.delete(tables).where(eq(tables.id, table.id));
      }
    }
  }

  async areAllTablesVacant(adminUid: string): Promise<boolean> {
    const allTables = await this.getTablesByAdminUid(adminUid);
    return allTables.every((table) => table.status === "vacant");
  }

  async hasNonVacantTables(adminUid: string): Promise<boolean> {
    const allTables = await this.getTablesByAdminUid(adminUid);
    return allTables.some((table) => table.status !== "vacant");
  }

  async cancelTable(id: string): Promise<Table | undefined> {
    const table = await this.getTable(id);
    if (!table) return undefined;

    // Cancel all active orders for this table
    const activeOrders = await this.getActiveOrdersByTableNumber(table.adminUid, table.tableNumber);
    for (const order of activeOrders) {
      await this.updateOrder(order.id, { orderStatus: "cancelled" });
    }

    // Reset the table to vacant with a new OTP
    const newOtp = this.generateOtp();
    const [updatedTable] = await db
      .update(tables)
      .set({
        status: "vacant",
        activeSessionId: null,
        otp: newOtp,
        updatedAt: new Date(),
      })
      .where(eq(tables.id, id))
      .returning();
    return updatedTable;
  }

  // Order methods
  async getOrdersByAdminUid(adminUid: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.adminUid, adminUid)).orderBy(desc(orders.createdAt));
  }

  async getActiveOrdersByAdminUid(adminUid: string): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(and(eq(orders.adminUid, adminUid), eq(orders.orderStatus, "active")))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersBySessionId(sessionId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.sessionId, sessionId)).orderBy(desc(orders.createdAt));
  }

  async getActiveOrdersByTableNumber(adminUid: string, tableNumber: number): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(and(
        eq(orders.adminUid, adminUid),
        eq(orders.tableNumber, tableNumber),
        eq(orders.orderStatus, "active")
      ))
      .orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(data).returning();
    return order;
  }

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async updateOrderItemStatus(orderId: string, itemIndex: number, status: OrderItem['status']): Promise<Order | undefined> {
    const order = await this.getOrder(orderId);
    if (!order) return undefined;

    const items = [...order.items];
    if (itemIndex < 0 || itemIndex >= items.length) return undefined;

    items[itemIndex] = { ...items[itemIndex], status };
    return this.updateOrder(orderId, { items });
  }

  // Bill methods
  async getBillsByAdminUid(adminUid: string): Promise<Bill[]> {
    return db.select().from(bills).where(eq(bills.adminUid, adminUid)).orderBy(desc(bills.generatedAt));
  }

  async getFinalizedBillsByAdminUid(adminUid: string): Promise<Bill[]> {
    return db.select().from(bills).where(
      and(
        eq(bills.adminUid, adminUid),
        eq(bills.isFinal, true)
      )
    ).orderBy(desc(bills.generatedAt));
  }

  async getBillBySessionId(sessionId: string): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.sessionId, sessionId));
    return bill;
  }

  async getBill(id: string): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async createBill(data: InsertBill): Promise<Bill> {
    const [bill] = await db.insert(bills).values(data).returning();
    return bill;
  }

  async updateBill(id: string, data: Partial<InsertBill>): Promise<Bill | undefined> {
    const [bill] = await db.update(bills).set(data).where(eq(bills.id, id)).returning();
    return bill;
  }

  async getNextBillNumber(adminUid: string): Promise<string> {
    const existingBills = await this.getBillsByAdminUid(adminUid);
    const nextNumber = existingBills.length + 1;
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    return `BILL-${dateStr}-${String(nextNumber).padStart(4, "0")}`;
  }

  // Sales History methods
  async getSalesHistoryByAdminUid(adminUid: string): Promise<SalesHistory[]> {
    return db.select().from(salesHistory).where(eq(salesHistory.adminUid, adminUid)).orderBy(desc(salesHistory.createdAt));
  }

  async getSalesHistoryByDateRange(adminUid: string, startDate: Date, endDate: Date): Promise<SalesHistory[]> {
    return db
      .select()
      .from(salesHistory)
      .where(
        and(
          eq(salesHistory.adminUid, adminUid),
          gte(salesHistory.createdAt, startDate),
          lte(salesHistory.createdAt, endDate)
        )
      )
      .orderBy(desc(salesHistory.createdAt));
  }

  async createSalesHistory(data: InsertSalesHistory): Promise<SalesHistory> {
    const [record] = await db.insert(salesHistory).values(data).returning();
    return record;
  }

  async getTodaySales(adminUid: string): Promise<{ totalSales: number; orderCount: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await this.getSalesHistoryByDateRange(adminUid, today, tomorrow);
    const totalSales = todaySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);

    return { totalSales, orderCount: todaySales.length };
  }

  // Auth Token methods
  async createAuthToken(data: InsertAuthToken): Promise<AuthToken> {
    const [token] = await db.insert(authTokens).values(data).returning();
    return token;
  }

  async getValidAuthToken(token: string): Promise<AuthToken | undefined> {
    const [authToken] = await db
      .select()
      .from(authTokens)
      .where(and(eq(authTokens.token, token), gte(authTokens.expiresAt, new Date())));
    return authToken;
  }

  async deleteAuthToken(token: string): Promise<void> {
    await db.delete(authTokens).where(eq(authTokens.token, token));
  }

  async deleteExpiredTokens(): Promise<void> {
    await db.delete(authTokens).where(lt(authTokens.expiresAt, new Date()));
  }

  // JWT Blacklist methods (using auth_tokens table for blacklist)
  async blacklistToken(token: string, expiresAt: Date): Promise<void> {
    await db.insert(authTokens).values({ token, adminUid: 'blacklisted', expiresAt }).onConflictDoNothing();
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(authTokens)
      .where(and(eq(authTokens.token, token), eq(authTokens.adminUid, 'blacklisted')));
    return !!existing;
  }

  // Super Admin methods
  async getSuperAdminByUid(superAdminUid: string): Promise<SuperAdmin | undefined> {
    const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.superAdminUid, superAdminUid));
    return admin;
  }

  async getSuperAdminByResetToken(token: string): Promise<SuperAdmin | undefined> {
    const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.resetToken, token));
    return admin;
  }

  async setSuperAdminResetToken(superAdminUid: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(superAdmins)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(superAdmins.superAdminUid, superAdminUid));
  }

  async clearSuperAdminResetToken(superAdminUid: string): Promise<void> {
    await db
      .update(superAdmins)
      .set({ resetToken: null, resetTokenExpiry: null })
      .where(eq(superAdmins.superAdminUid, superAdminUid));
  }

  async updateSuperAdminPassword(superAdminUid: string, hashedPassword: string): Promise<void> {
    await db
      .update(superAdmins)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(superAdmins.superAdminUid, superAdminUid));
  }

  async createSuperAdmin(data: InsertSuperAdmin): Promise<SuperAdmin> {
    const [admin] = await db.insert(superAdmins).values(data).returning();
    return admin;
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    return db.select().from(restaurants).orderBy(desc(restaurants.createdAt));
  }

  async deleteRestaurant(adminUid: string): Promise<void> {
    // Delete all related data in order (to respect foreign key constraints)
    await db.delete(salesHistory).where(eq(salesHistory.adminUid, adminUid));
    await db.delete(bills).where(eq(bills.adminUid, adminUid));
    await db.delete(orders).where(eq(orders.adminUid, adminUid));
    await db.delete(tables).where(eq(tables.adminUid, adminUid));
    await db.delete(menuItems).where(eq(menuItems.adminUid, adminUid));
    await db.delete(authTokens).where(eq(authTokens.adminUid, adminUid));
    await db.delete(restaurants).where(eq(restaurants.adminUid, adminUid));
  }
}

export const storage = new DatabaseStorage();
