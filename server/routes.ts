import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Maileroo email sending function
async function sendMailerooEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.MAILEROO_API_KEY;
  if (!apiKey) {
    console.log('Maileroo API key not configured');
    return false;
  }

  try {
    const response = await fetch('https://smtp.maileroo.com/api/v2/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        from: {
          address: 'noreply@4907f590a2ca0174.maileroo.org',
          display_name: 'TableServe'
        },
        to: [{
          address: to
        }],
        subject: subject,
        html: html
      })
    });

    const result = await response.json();
    if (response.ok && result.success) {
      console.log('Email sent successfully:', result.message);
      return true;
    } else {
      console.error('Maileroo error:', result.message || result);
      return false;
    }
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}
import {
  loginSchema,
  resetPasswordRequestSchema,
  insertRestaurantSchema,
  insertMenuItemSchema,
  insertOrderSchema,
  insertBillSchema,
  superAdminLoginSchema,
  type OrderItem,
  type BillItem,
} from "@shared/schema";
import { z } from "zod";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY_HOURS = 24;
const JWT_SECRET = process.env.JWT_SECRET || "tableserve-secret-key-change-in-production";

interface JWTPayload {
  adminUid: string;
  iat: number;
  exp: number;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function generateJWT(adminUid: string): string {
  return jwt.sign({ adminUid }, JWT_SECRET, { expiresIn: `${TOKEN_EXPIRY_HOURS}h` });
}

function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

interface AuthenticatedRequest extends Request {
  adminUid?: string;
}

async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.substring(7);
  
  // Verify JWT signature and expiration
  const payload = verifyJWT(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Check if token is blacklisted (for logout support)
  const isBlacklisted = await storage.isTokenBlacklisted(token);
  if (isBlacklisted) {
    return res.status(401).json({ error: "Token has been revoked" });
  }

  req.adminUid = payload.adminUid;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Clean up expired tokens periodically
  setInterval(() => {
    storage.deleteExpiredTokens().catch(console.error);
  }, 3600000);

  // ========== AUTH ROUTES ==========

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const restaurant = await storage.getRestaurantByAdminUid(data.adminUid);

      if (!restaurant) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await verifyPassword(data.password, restaurant.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Initialize tables if needed
      await storage.initializeTables(restaurant.adminUid, restaurant.tableCount);

      // Generate JWT token
      const token = generateJWT(restaurant.adminUid);

      const { password, resetToken, resetTokenExpiry, ...safeRestaurant } = restaurant;
      res.json({ admin: safeRestaurant, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Register schema for validation
  const registerSchema = insertRestaurantSchema.extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  // Register (create new restaurant)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);

      // Check if admin UID already exists
      const existing = await storage.getRestaurantByAdminUid(data.adminUid);
      if (existing) {
        return res.status(400).json({ error: "Admin UID already exists" });
      }

      // Check if email already exists
      const existingEmail = await storage.getRestaurantByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await hashPassword(data.password);
      const restaurant = await storage.createRestaurant({
        adminUid: data.adminUid,
        password: hashedPassword,
        restaurantName: data.restaurantName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        gstNumber: data.gstNumber,
        tableCount: data.tableCount || 10,
      });

      // Initialize tables
      await storage.initializeTables(restaurant.adminUid, restaurant.tableCount);

      // Generate JWT token
      const token = generateJWT(restaurant.adminUid);

      const { password: _, resetToken, resetTokenExpiry, ...safeRestaurant } = restaurant;
      res.json({ admin: safeRestaurant, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        // Blacklist the JWT token
        const payload = verifyJWT(token);
        if (payload) {
          const expiresAt = new Date(payload.exp * 1000);
          await storage.blacklistToken(token, expiresAt);
        }
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Forgot password
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const data = resetPasswordRequestSchema.parse(req.body);
      const restaurant = await storage.getRestaurantByAdminUid(data.adminUid);

      if (!restaurant) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!restaurant.email) {
        return res.status(404).json({ error: "Email not found for this user" });
      }

      const token = generateToken();
      const expiry = new Date(Date.now() + 3600000); // 1 hour

      await storage.setResetToken(restaurant.adminUid, token, expiry);

      // Build the reset URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DOMAINS 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : 'http://localhost:5000';
      const resetUrl = `${baseUrl}/reset-password/${token}`;

      // Send password reset email using Maileroo
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed;">Reset Your Password</h2>
          <p>Hello,</p>
          <p>We received a request to reset the password for your TableServe account for <strong>${restaurant.restaurantName}</strong>.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">TableServe Restaurant Management System</p>
        </div>
      `;
      
      const emailSent = await sendMailerooEmail(
        restaurant.email,
        'Reset Your Password - TableServe',
        emailHtml
      );
      
      if (!emailSent) {
        console.log('Email service not configured or failed. Reset URL:', resetUrl);
      }

      // Mask the email for privacy (e.g., te***@gmail.com)
      const email = restaurant.email;
      const [localPart, domain] = email.split('@');
      const maskedLocal = localPart.length > 2 
        ? localPart.substring(0, 2) + '***' 
        : localPart[0] + '***';
      const maskedEmail = `${maskedLocal}@${domain}`;

      res.json({ message: `Reset link sent to ${maskedEmail}`, email: maskedEmail });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset password
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      const restaurant = await storage.getRestaurantByResetToken(token);
      if (!restaurant) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      if (restaurant.resetTokenExpiry && new Date() > restaurant.resetTokenExpiry) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updatePassword(restaurant.adminUid, hashedPassword);
      await storage.clearResetToken(restaurant.adminUid);

      res.json({ message: "Password reset successful" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // ========== RESTAURANT ROUTES ==========

  // Get restaurant by admin UID (public for customer access)
  app.get("/api/restaurants/:adminUid", async (req: Request, res: Response) => {
    try {
      const restaurant = await storage.getRestaurantByAdminUid(req.params.adminUid);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const { password, resetToken, resetTokenExpiry, ...safeRestaurant } = restaurant;
      res.json(safeRestaurant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });

  // Update restaurant settings schema
  const updateRestaurantSchema = z.object({
    restaurantName: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    gstNumber: z.string().optional(),
    upiId: z.string().optional(),
    tableCount: z.number().int().positive().optional(),
  });

  // Update restaurant settings (protected)
  app.patch("/api/restaurants/:adminUid", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.adminUid !== req.params.adminUid) {
        return res.status(403).json({ error: "Not authorized to modify this restaurant" });
      }

      const data = updateRestaurantSchema.parse(req.body);

      // If table count is being changed, check if all tables are vacant first
      if (data.tableCount !== undefined) {
        const currentRestaurant = await storage.getRestaurantByAdminUid(req.params.adminUid);
        if (currentRestaurant && data.tableCount !== currentRestaurant.tableCount) {
          const hasNonVacant = await storage.hasNonVacantTables(req.params.adminUid);
          if (hasNonVacant) {
            return res.status(400).json({ 
              error: "Cannot change table count while tables are occupied. Please ensure all tables are vacant first." 
            });
          }
        }
      }

      const restaurant = await storage.updateRestaurant(req.params.adminUid, data);

      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Sync tables if count changed (add new ones and remove excess)
      if (data.tableCount !== undefined) {
        await storage.syncTables(restaurant.adminUid, data.tableCount);
      }

      const { password, resetToken, resetTokenExpiry, ...safeRestaurant } = restaurant;
      res.json(safeRestaurant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update restaurant" });
    }
  });

  // ========== MENU ITEM ROUTES ==========

  // Get menu items for admin (protected)
  app.get("/api/menu-items/:adminUid", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.adminUid !== req.params.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const items = await storage.getMenuItemsByAdminUid(req.params.adminUid);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  // Get menu items for customers (public, only available items)
  app.get("/api/menu-items/public/:adminUid", async (req: Request, res: Response) => {
    try {
      const items = await storage.getMenuItemsByAdminUid(req.params.adminUid);
      const availableItems = items.filter((item) => item.isAvailable);
      res.json(availableItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  // Create menu item (protected)
  app.post("/api/menu-items", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = insertMenuItemSchema.parse(req.body);
      if (req.adminUid !== data.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const item = await storage.createMenuItem(data);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create menu item" });
    }
  });

  // Update menu item schema
  const updateMenuItemSchema = z.object({
    name: z.string().optional(),
    price: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    ingredients: z.array(z.string()).optional(),
    calories: z.number().optional(),
    isAvailable: z.boolean().optional(),
  });

  // Update menu item (protected)
  app.patch("/api/menu-items/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existingItem = await storage.getMenuItem(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      if (existingItem.adminUid !== req.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const data = updateMenuItemSchema.parse(req.body);
      const item = await storage.updateMenuItem(req.params.id, data);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });

  // Delete menu item (protected)
  app.delete("/api/menu-items/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existingItem = await storage.getMenuItem(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      if (existingItem.adminUid !== req.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      await storage.deleteMenuItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  // ========== TABLE ROUTES ==========

  // Check if customer session is still valid (for real-time reset detection)
  // NOTE: This route must be BEFORE /api/tables/:adminUid to avoid being caught by that route
  app.get("/api/tables/session/validate", async (req: Request, res: Response) => {
    try {
      const { adminUid, tableNumber, sessionId } = req.query;
      
      if (!adminUid || !tableNumber || !sessionId) {
        return res.status(400).json({ error: "adminUid, tableNumber, and sessionId are required" });
      }
      
      const table = await storage.getTableByNumber(adminUid as string, parseInt(tableNumber as string));
      if (!table) {
        return res.json({ valid: false, reason: "table_not_found" });
      }
      
      // Check if the session is still active on this table
      if (table.status === 'vacant' || table.activeSessionId !== sessionId) {
        return res.json({ valid: false, reason: "session_ended" });
      }
      
      return res.json({ valid: true, tableStatus: table.status });
    } catch (error) {
      res.status(500).json({ error: "Failed to validate session" });
    }
  });

  // Get tables for admin (protected)
  app.get("/api/tables/:adminUid", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.adminUid !== req.params.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const tablesList = await storage.getTablesByAdminUid(req.params.adminUid);
      res.json(tablesList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tables" });
    }
  });

  // Update table status schema
  const updateTableSchema = z.object({
    status: z.enum(["vacant", "active", "billing"]).optional(),
    activeSessionId: z.string().nullable().optional(),
  });

  // Update table status (protected)
  app.patch("/api/tables/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existingTable = await storage.getTable(req.params.id);
      if (!existingTable) {
        return res.status(404).json({ error: "Table not found" });
      }
      if (existingTable.adminUid !== req.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const data = updateTableSchema.parse(req.body);
      const table = await storage.updateTable(req.params.id, data);
      res.json(table);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update table" });
    }
  });

  // Reset table (mark as vacant) (protected)
  app.post("/api/tables/:id/reset", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existingTable = await storage.getTable(req.params.id);
      if (!existingTable) {
        return res.status(404).json({ error: "Table not found" });
      }
      if (existingTable.adminUid !== req.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const table = await storage.resetTable(req.params.id);
      res.json(table);
    } catch (error) {
      res.status(500).json({ error: "Failed to reset table" });
    }
  });

  // Cancel table - cancel all orders and reset to vacant (protected)
  app.post("/api/tables/:id/cancel", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existingTable = await storage.getTable(req.params.id);
      if (!existingTable) {
        return res.status(404).json({ error: "Table not found" });
      }
      if (existingTable.adminUid !== req.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (existingTable.status === 'vacant') {
        return res.status(400).json({ error: "Table is already vacant" });
      }
      const table = await storage.cancelTable(req.params.id);
      res.json({ success: true, table, message: "Table cancelled. All orders have been cancelled and table is now vacant." });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel table" });
    }
  });

  // Join table (public - customer joins table with OTP verification)
  app.post("/api/tables/join", async (req: Request, res: Response) => {
    try {
      const { adminUid, tableNumber, otp } = req.body;
      
      if (!adminUid || !tableNumber || !otp) {
        return res.status(400).json({ error: "adminUid, tableNumber and OTP are required" });
      }
      
      const table = await storage.getTableByNumber(adminUid, tableNumber);
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }
      
      // Verify OTP
      if (table.otp !== otp) {
        return res.status(401).json({ error: "Invalid OTP. Please get the correct OTP from restaurant staff." });
      }
      
      // If table is active and has a session, return the existing session
      if (table.status === 'active' && table.activeSessionId) {
        return res.json({ 
          sessionId: table.activeSessionId, 
          isExistingSession: true,
          tableNumber: table.tableNumber 
        });
      }
      
      // Otherwise, create a new session
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Update table to active with new session
      await storage.updateTable(table.id, {
        status: "active",
        activeSessionId: newSessionId,
      });
      
      return res.json({ 
        sessionId: newSessionId, 
        isExistingSession: false,
        tableNumber: table.tableNumber 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to join table" });
    }
  });

  // Regenerate table OTP (protected - admin only)
  app.post("/api/tables/:id/regenerate-otp", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existingTable = await storage.getTable(req.params.id);
      if (!existingTable) {
        return res.status(404).json({ error: "Table not found" });
      }
      if (existingTable.adminUid !== req.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const table = await storage.regenerateTableOtp(req.params.id);
      res.json(table);
    } catch (error) {
      res.status(500).json({ error: "Failed to regenerate OTP" });
    }
  });

  // ========== ORDER ROUTES ==========

  // Get all orders for admin (protected)
  app.get("/api/orders/:adminUid", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.adminUid !== req.params.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const ordersList = await storage.getOrdersByAdminUid(req.params.adminUid);
      res.json(ordersList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Get active orders for admin (protected)
  app.get("/api/orders/:adminUid/active", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.adminUid !== req.params.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const ordersList = await storage.getActiveOrdersByAdminUid(req.params.adminUid);
      res.json(ordersList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active orders" });
    }
  });

  // Get orders for customer by session (public for customer access)
  app.get("/api/orders/customer/:sessionId", async (req: Request, res: Response) => {
    try {
      const ordersList = await storage.getOrdersBySessionId(req.params.sessionId);
      res.json(ordersList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Get active orders for customer by table number (public for customer access)
  app.get("/api/orders/table/:adminUid/:tableNumber", async (req: Request, res: Response) => {
    try {
      const { adminUid, tableNumber } = req.params;
      const ordersList = await storage.getActiveOrdersByTableNumber(adminUid, parseInt(tableNumber));
      res.json(ordersList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Create order (public for customer access)
  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const data = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(data);

      // Update table status to active
      const table = await storage.getTableByNumber(data.adminUid, data.tableNumber);
      if (table) {
        await storage.updateTable(table.id, {
          status: "active",
          activeSessionId: data.sessionId,
        });
      }

      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Update order item status schema
  const updateOrderItemStatusSchema = z.object({
    status: z.enum(["pending", "accepted", "processing", "completed", "rejected"]),
  });

  // Update order item status (protected - admin only)
  app.patch("/api/orders/:orderId/items/:itemIndex", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId, itemIndex } = req.params;
      const existingOrder = await storage.getOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (existingOrder.adminUid !== req.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const data = updateOrderItemStatusSchema.parse(req.body);

      const order = await storage.updateOrderItemStatus(orderId, parseInt(itemIndex), data.status);
      if (!order) {
        return res.status(404).json({ error: "Order or item not found" });
      }
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update order item" });
    }
  });

  // Update order status schema
  const updateOrderStatusSchema = z.object({
    orderStatus: z.enum(["active", "completed", "cancelled"]).optional(),
  });

  // Update order status (protected)
  app.patch("/api/orders/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existingOrder = await storage.getOrder(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (existingOrder.adminUid !== req.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const data = updateOrderStatusSchema.parse(req.body);
      const order = await storage.updateOrder(req.params.id, data);
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // ========== BILL ROUTES ==========

  // Get bills for admin (protected)
  app.get("/api/bills/:adminUid", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.adminUid !== req.params.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const billsList = await storage.getBillsByAdminUid(req.params.adminUid);
      res.json(billsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  });

  // Get bill by session ID
  app.get("/api/bills/session/:sessionId", async (req: Request, res: Response) => {
    try {
      const bill = await storage.getBillBySessionId(req.params.sessionId);
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      res.json(bill);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bill" });
    }
  });

  // Get bill history (finalized bills only) - protected
  app.get("/api/bills/history/:adminUid", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.adminUid !== req.params.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const billsList = await storage.getFinalizedBillsByAdminUid(req.params.adminUid);
      res.json(billsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bill history" });
    }
  });

  // Generate bill (protected)
  app.post("/api/bills", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { adminUid, sessionId, tableNumber, items, discountPercentage, serviceChargePercentage } = req.body;

      if (req.adminUid !== adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const billNumber = await storage.getNextBillNumber(adminUid);

      // Calculate totals
      const subtotal = items.reduce(
        (sum: number, item: BillItem) => sum + parseFloat(item.price) * item.quantity,
        0
      );

      const discountAmount = (subtotal * (discountPercentage || 0)) / 100;
      const afterDiscount = subtotal - discountAmount;
      const serviceChargeAmount = (afterDiscount * (serviceChargePercentage || 0)) / 100;
      const totalAmount = afterDiscount + serviceChargeAmount;

      const bill = await storage.createBill({
        billNumber,
        adminUid,
        sessionId,
        tableNumber,
        items,
        subtotal: subtotal.toFixed(2),
        discountPercentage: (discountPercentage || 0).toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        serviceChargePercentage: (serviceChargePercentage || 0).toFixed(2),
        serviceChargeAmount: serviceChargeAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        isFinal: false,
      });

      // Update table status to billing
      const table = await storage.getTableByNumber(adminUid, tableNumber);
      if (table) {
        await storage.updateTable(table.id, { status: "billing" });
      }

      res.json(bill);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate bill" });
    }
  });

  // Finalize bill and create sales record (protected)
  app.post("/api/bills/:id/finalize", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bill = await storage.getBill(req.params.id);
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }

      if (req.adminUid !== bill.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Mark bill as final
      await storage.updateBill(bill.id, { isFinal: true });

      // Create sales history record
      await storage.createSalesHistory({
        adminUid: bill.adminUid,
        billId: bill.id,
        tableNumber: bill.tableNumber,
        totalAmount: bill.totalAmount,
        itemsSold: bill.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      // Complete all orders for this session
      const sessionOrders = await storage.getOrdersBySessionId(bill.sessionId);
      for (const order of sessionOrders) {
        await storage.updateOrder(order.id, { orderStatus: "completed" });
      }

      // Reset table
      const table = await storage.getTableByNumber(bill.adminUid, bill.tableNumber);
      if (table) {
        await storage.resetTable(table.id);
      }

      res.json({ success: true, bill });
    } catch (error) {
      res.status(500).json({ error: "Failed to finalize bill" });
    }
  });

  // ========== ANALYTICS ROUTES ==========

  // Get today's sales summary (protected)
  app.get("/api/analytics/:adminUid/today", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.adminUid !== req.params.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const summary = await storage.getTodaySales(req.params.adminUid);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get sales by date range (protected)
  app.get("/api/analytics/:adminUid/sales", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.adminUid !== req.params.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);

      const sales = await storage.getSalesHistoryByDateRange(req.params.adminUid, start, end);

      // Group sales by date
      const groupedSales: Record<string, { totalSales: number; orderCount: number; items: Record<string, number> }> = {};

      for (const sale of sales) {
        const dateKey = sale.createdAt!.toISOString().split("T")[0];
        if (!groupedSales[dateKey]) {
          groupedSales[dateKey] = { totalSales: 0, orderCount: 0, items: {} };
        }
        groupedSales[dateKey].totalSales += parseFloat(sale.totalAmount);
        groupedSales[dateKey].orderCount += 1;

        for (const item of sale.itemsSold) {
          groupedSales[dateKey].items[item.name] = (groupedSales[dateKey].items[item.name] || 0) + item.quantity;
        }
      }

      res.json({
        sales: groupedSales,
        totalSales: sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0),
        totalOrders: sales.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales analytics" });
    }
  });

  // Get detailed analytics (protected)
  app.get("/api/analytics/:adminUid/detailed", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.adminUid !== req.params.adminUid) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const adminUid = req.params.adminUid;
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);

      // Get all data needed for analytics
      const [sales, allOrders, allTables, allBills] = await Promise.all([
        storage.getSalesHistoryByDateRange(adminUid, start, end),
        storage.getOrdersByAdminUid(adminUid),
        storage.getTablesByAdminUid(adminUid),
        storage.getBillsByAdminUid(adminUid),
      ]);

      // Quick Actions Data
      const pendingOrdersCount = allOrders.filter(o => 
        o.orderStatus === 'active' && o.items.some(i => i.status === 'pending')
      ).length;
      const tablesAwaitingBill = allTables.filter(t => t.status === 'billing').length;
      const activeTables = allTables.filter(t => t.status === 'active').length;

      // Time-Based Analytics - Peak Hours
      const hourlyData: Record<number, { orders: number; revenue: number }> = {};
      for (let i = 0; i < 24; i++) hourlyData[i] = { orders: 0, revenue: 0 };
      
      const dayOfWeekData: Record<number, { orders: number; revenue: number }> = {};
      for (let i = 0; i < 7; i++) dayOfWeekData[i] = { orders: 0, revenue: 0 };

      sales.forEach(sale => {
        const date = new Date(sale.createdAt!);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        const amount = parseFloat(sale.totalAmount);
        
        hourlyData[hour].orders++;
        hourlyData[hour].revenue += amount;
        dayOfWeekData[dayOfWeek].orders++;
        dayOfWeekData[dayOfWeek].revenue += amount;
      });

      // Find peak hour
      const peakHour = Object.entries(hourlyData)
        .sort((a, b) => b[1].orders - a[1].orders)[0];

      // Financial Breakdown
      const filteredBills = allBills.filter(b => {
        const billDate = new Date(b.generatedAt!);
        return billDate >= start && billDate <= end;
      });

      let totalDiscount = 0;
      let totalServiceCharge = 0;
      let totalSubtotal = 0;

      filteredBills.forEach(bill => {
        totalDiscount += parseFloat(bill.discountAmount || '0');
        totalServiceCharge += parseFloat(bill.serviceChargeAmount || '0');
        totalSubtotal += parseFloat(bill.subtotal || '0');
      });

      // Customer Analytics
      const totalItems = sales.reduce((sum, s) => 
        sum + s.itemsSold.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
      );
      const avgItemsPerOrder = sales.length > 0 ? totalItems / sales.length : 0;

      // Most popular combos (items ordered together)
      const comboPairs: Record<string, number> = {};
      sales.forEach(sale => {
        const items = sale.itemsSold.map(i => i.name).sort();
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            const combo = `${items[i]} + ${items[j]}`;
            comboPairs[combo] = (comboPairs[combo] || 0) + 1;
          }
        }
      });

      const popularCombos = Object.entries(comboPairs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([combo, count]) => ({ combo, count }));

      // Table turnover rate
      const completedSessions = sales.length;
      const avgTableTurnover = allTables.length > 0 
        ? (completedSessions / allTables.length).toFixed(1) 
        : '0';

      // Payment Mode Analytics
      const paymentModes = {
        cash: { count: 0, amount: 0 },
        upi: { count: 0, amount: 0 },
        card: { count: 0, amount: 0 },
        wallet: { count: 0, amount: 0 },
      };
      
      filteredBills.forEach(bill => {
        const mode = (bill.paymentMode || 'cash') as keyof typeof paymentModes;
        const amount = parseFloat(bill.totalAmount || '0');
        if (paymentModes[mode]) {
          paymentModes[mode].count++;
          paymentModes[mode].amount += amount;
        } else {
          paymentModes.cash.count++;
          paymentModes.cash.amount += amount;
        }
      });

      // Category-wise Revenue from sales
      const categoryRevenue = {
        food: 0,      // veg + nonveg
        liquor: 0,    // liquor
        beverages: 0, // drinks
        desserts: 0,  // cake
      };
      
      // Get menu items to map categories
      const menuItems = await storage.getMenuItemsByAdminUid(adminUid);
      const menuItemMap = new Map(menuItems.map(item => [item.name, item.category]));
      
      sales.forEach(sale => {
        sale.itemsSold.forEach(item => {
          const category = menuItemMap.get(item.name) || 'veg';
          const itemTotal = parseFloat(item.price) * item.quantity;
          
          if (category === 'veg' || category === 'nonveg') {
            categoryRevenue.food += itemTotal;
          } else if (category === 'liquor') {
            categoryRevenue.liquor += itemTotal;
          } else if (category === 'drinks') {
            categoryRevenue.beverages += itemTotal;
          } else if (category === 'cake') {
            categoryRevenue.desserts += itemTotal;
          }
        });
      });

      // GST Summary (5% for restaurants in India - 2.5% CGST + 2.5% SGST)
      const totalRevenue = totalSubtotal - totalDiscount + totalServiceCharge;
      const totalTaxableAmount = totalSubtotal - totalDiscount;
      const gstRate = 0.05; // 5% total GST
      const totalGst = totalTaxableAmount * gstRate;
      const cgst = totalGst / 2;
      const sgst = totalGst / 2;

      // Period Comparison - Calculate previous period revenue
      // Calculate the number of days in the current period (inclusive)
      const oneDayMs = 24 * 60 * 60 * 1000;
      const currentPeriodDays = Math.ceil((end.getTime() - start.getTime()) / oneDayMs) + 1;
      
      // Previous period: same number of days ending the day before current period starts
      const previousEnd = new Date(start);
      previousEnd.setDate(previousEnd.getDate() - 1);
      previousEnd.setHours(23, 59, 59, 999);
      
      const previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - currentPeriodDays + 1);
      previousStart.setHours(0, 0, 0, 0);
      
      const previousSales = await storage.getSalesHistoryByDateRange(adminUid, previousStart, previousEnd);
      const previousPeriodRevenue = previousSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
      const currentPeriodRevenue = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
      
      const growthPercentage = previousPeriodRevenue > 0 
        ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
        : currentPeriodRevenue > 0 ? 100 : 0;

      res.json({
        quickActions: {
          pendingOrdersCount,
          tablesAwaitingBill,
          activeTables,
          totalTables: allTables.length,
        },
        timeBased: {
          hourlyData: Object.entries(hourlyData).map(([hour, data]) => ({
            hour: parseInt(hour),
            label: `${hour.padStart(2, '0')}:00`,
            ...data,
          })),
          dayOfWeekData: Object.entries(dayOfWeekData).map(([day, data]) => ({
            day: parseInt(day),
            label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(day)],
            ...data,
          })),
          peakHour: peakHour ? { hour: parseInt(peakHour[0]), ...peakHour[1] } : null,
        },
        financial: {
          totalSubtotal,
          totalDiscount,
          totalServiceCharge,
          totalRevenue,
          discountPercentage: totalSubtotal > 0 ? ((totalDiscount / totalSubtotal) * 100).toFixed(1) : '0',
        },
        customerAnalytics: {
          avgItemsPerOrder: avgItemsPerOrder.toFixed(1),
          popularCombos,
          tableTurnoverRate: avgTableTurnover,
          totalCompletedOrders: sales.length,
        },
        paymentModes,
        categoryRevenue,
        gstSummary: {
          totalTaxableAmount: Math.round(totalTaxableAmount),
          cgst: Math.round(cgst),
          sgst: Math.round(sgst),
          totalGst: Math.round(totalGst),
        },
        comparison: {
          previousPeriodRevenue: Math.round(previousPeriodRevenue),
          currentPeriodRevenue: Math.round(currentPeriodRevenue),
          growthPercentage: parseFloat(growthPercentage.toFixed(1)),
          isPositiveGrowth: growthPercentage >= 0,
        },
      });
    } catch (error) {
      console.error('Detailed analytics error:', error);
      res.status(500).json({ error: "Failed to fetch detailed analytics" });
    }
  });

  // ========== AI SUGGESTION ROUTES ==========

  // Get AI-powered food pairing suggestions
  app.post("/api/suggestions", async (req: Request, res: Response) => {
    try {
      const { adminUid, selectedItemId, cartItemIds } = req.body;

      if (!adminUid || !selectedItemId) {
        return res.status(400).json({ error: "adminUid and selectedItemId are required" });
      }

      // Get the selected item
      const selectedItem = await storage.getMenuItem(selectedItemId);
      if (!selectedItem) {
        return res.status(404).json({ error: "Selected item not found" });
      }

      // Get all available menu items for this restaurant
      const allMenuItems = await storage.getMenuItemsByAdminUid(adminUid);
      const availableItems = allMenuItems.filter(item => item.isAvailable);

      // Import and call the OpenAI suggestion function
      const { getAIPairingSuggestions } = await import("./openai");
      
      const menuItemsForAI = availableItems.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        description: item.description,
        ingredients: item.ingredients,
        price: item.price,
      }));

      const selectedForAI = {
        id: selectedItem.id,
        name: selectedItem.name,
        category: selectedItem.category,
        subcategory: selectedItem.subcategory,
        description: selectedItem.description,
        ingredients: selectedItem.ingredients,
        price: selectedItem.price,
      };

      const result = await getAIPairingSuggestions(
        selectedForAI,
        menuItemsForAI,
        cartItemIds || []
      );

      // Enrich suggestions with full item details
      const enrichedSuggestions = result.suggestions.map(suggestion => {
        const fullItem = availableItems.find(item => item.id === suggestion.itemId);
        return {
          ...suggestion,
          item: fullItem || null,
        };
      }).filter(s => s.item !== null);

      res.json({ suggestions: enrichedSuggestions });
    } catch (error) {
      console.error("Suggestion error:", error);
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  });

  // ========== SUPER ADMIN ROUTES ==========

  interface SuperAdminAuthenticatedRequest extends Request {
    superAdminUid?: string;
  }

  function generateSuperAdminJWT(superAdminUid: string): string {
    return jwt.sign({ superAdminUid, isSuperAdmin: true }, JWT_SECRET, { expiresIn: `${TOKEN_EXPIRY_HOURS}h` });
  }

  async function superAdminAuthMiddleware(req: SuperAdminAuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { superAdminUid: string; isSuperAdmin: boolean };
      if (!payload.isSuperAdmin) {
        return res.status(401).json({ error: "Super admin access required" });
      }
      req.superAdminUid = payload.superAdminUid;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  // Super Admin Login
  app.post("/api/superadmin/login", async (req: Request, res: Response) => {
    try {
      const data = superAdminLoginSchema.parse(req.body);
      const superAdmin = await storage.getSuperAdminByUid(data.superAdminUid);

      if (!superAdmin) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await verifyPassword(data.password, superAdmin.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateSuperAdminJWT(superAdmin.superAdminUid);
      const { password, ...safeSuperAdmin } = superAdmin;
      res.json({ superAdmin: safeSuperAdmin, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Super Admin Forgot Password
  app.post("/api/superadmin/forgot-password", async (req: Request, res: Response) => {
    try {
      const { superAdminUid } = req.body;
      if (!superAdminUid) {
        return res.status(400).json({ error: "Super Admin ID is required" });
      }

      const superAdmin = await storage.getSuperAdminByUid(superAdminUid);

      if (!superAdmin) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!superAdmin.email) {
        return res.status(404).json({ error: "Email not found for this user" });
      }

      const token = generateToken();
      const expiry = new Date(Date.now() + 3600000); // 1 hour

      await storage.setSuperAdminResetToken(superAdmin.superAdminUid, token, expiry);

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DOMAINS 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : 'http://localhost:5000';
      const resetUrl = `${baseUrl}/superadmin-reset-password/${token}`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed;">Reset Your Super Admin Password</h2>
          <p>Hello ${superAdmin.name},</p>
          <p>We received a request to reset your Super Admin password for TableServe.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">TableServe Restaurant Management System</p>
        </div>
      `;
      
      const emailSent = await sendMailerooEmail(
        superAdmin.email,
        'Reset Your Super Admin Password - TableServe',
        emailHtml
      );
      
      if (!emailSent) {
        console.log('Email service not configured or failed. Reset URL:', resetUrl);
      }

      const email = superAdmin.email;
      const [localPart, domain] = email.split('@');
      const maskedLocal = localPart.length > 2 
        ? localPart.substring(0, 2) + '***' 
        : localPart[0] + '***';
      const maskedEmail = `${maskedLocal}@${domain}`;

      res.json({ message: `Reset link sent to ${maskedEmail}`, email: maskedEmail });
    } catch (error) {
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Super Admin Reset Password
  app.post("/api/superadmin/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      const superAdmin = await storage.getSuperAdminByResetToken(token);
      if (!superAdmin) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      if (superAdmin.resetTokenExpiry && new Date() > superAdmin.resetTokenExpiry) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateSuperAdminPassword(superAdmin.superAdminUid, hashedPassword);
      await storage.clearSuperAdminResetToken(superAdmin.superAdminUid);

      res.json({ message: "Password reset successful" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Get all restaurants (Super Admin only)
  app.get("/api/superadmin/restaurants", superAdminAuthMiddleware, async (req: SuperAdminAuthenticatedRequest, res: Response) => {
    try {
      const allRestaurants = await storage.getAllRestaurants();
      const safeRestaurants = allRestaurants.map(({ password, resetToken, resetTokenExpiry, ...rest }) => rest);
      res.json(safeRestaurants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });

  // Onboard new restaurant (Super Admin only)
  const superAdminCreateRestaurantSchema = insertRestaurantSchema.extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  app.post("/api/superadmin/restaurants", superAdminAuthMiddleware, async (req: SuperAdminAuthenticatedRequest, res: Response) => {
    try {
      const data = superAdminCreateRestaurantSchema.parse(req.body);

      // Check if admin UID already exists
      const existing = await storage.getRestaurantByAdminUid(data.adminUid);
      if (existing) {
        return res.status(400).json({ error: "Admin UID already exists" });
      }

      // Check if email already exists
      const existingEmail = await storage.getRestaurantByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await hashPassword(data.password);
      const restaurant = await storage.createRestaurant({
        adminUid: data.adminUid,
        password: hashedPassword,
        restaurantName: data.restaurantName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        gstNumber: data.gstNumber,
        tableCount: data.tableCount || 10,
      });

      // Initialize tables
      await storage.initializeTables(restaurant.adminUid, restaurant.tableCount);

      const { password: _, resetToken, resetTokenExpiry, ...safeRestaurant } = restaurant;
      res.json(safeRestaurant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create restaurant" });
    }
  });

  // Update restaurant (Super Admin only)
  const superAdminUpdateRestaurantSchema = z.object({
    restaurantName: z.string().optional(),
    address: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    gstNumber: z.string().optional(),
    tableCount: z.number().int().positive().optional(),
    password: z.string().min(6).optional(),
  });

  app.patch("/api/superadmin/restaurants/:adminUid", superAdminAuthMiddleware, async (req: SuperAdminAuthenticatedRequest, res: Response) => {
    try {
      const data = superAdminUpdateRestaurantSchema.parse(req.body);
      const { password: newPassword, ...restData } = data;

      const restaurant = await storage.updateRestaurant(req.params.adminUid, restData);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Update password if provided
      if (newPassword) {
        const hashedPassword = await hashPassword(newPassword);
        await storage.updatePassword(req.params.adminUid, hashedPassword);
      }

      // Update tables if count changed
      if (data.tableCount) {
        await storage.initializeTables(restaurant.adminUid, data.tableCount);
      }

      const { password, resetToken, resetTokenExpiry, ...safeRestaurant } = restaurant;
      res.json(safeRestaurant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update restaurant" });
    }
  });

  // Delete restaurant (Super Admin only)
  app.delete("/api/superadmin/restaurants/:adminUid", superAdminAuthMiddleware, async (req: SuperAdminAuthenticatedRequest, res: Response) => {
    try {
      const restaurant = await storage.getRestaurantByAdminUid(req.params.adminUid);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      await storage.deleteRestaurant(req.params.adminUid);
      res.json({ success: true, message: "Restaurant and all related data deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete restaurant" });
    }
  });

  return httpServer;
}
