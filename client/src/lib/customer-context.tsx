import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { MenuItem, OrderItem } from "@shared/schema";

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface CustomerContextType {
  tableNumber: number | null;
  sessionId: string | null;
  adminUid: string | null;
  cart: CartItem[];
  setTableNumber: (tableNumber: number) => void;
  setSessionId: (sessionId: string) => void;
  setAdminUid: (adminUid: string) => void;
  initializeSession: (tableNumber: number, sessionId: string, adminUid: string) => void;
  addToCart: (menuItem: MenuItem) => void;
  removeFromCart: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  resetCustomerSession: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [tableNumber, setTableNumberState] = useState<number | null>(null);
  const [sessionId, setSessionIdState] = useState<string | null>(null);
  const [adminUid, setAdminUidState] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const storedSession = localStorage.getItem("customer_session");
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        setTableNumberState(session.tableNumber);
        setSessionIdState(session.sessionId);
        setAdminUidState(session.adminUid);
        setCart(session.cart || []);
      } catch {
        localStorage.removeItem("customer_session");
      }
    }
  }, []);

  const saveSession = (table: number | null, session: string | null, admin: string | null, cartItems: CartItem[]) => {
    if (table && session && admin) {
      localStorage.setItem("customer_session", JSON.stringify({
        tableNumber: table,
        sessionId: session,
        adminUid: admin,
        cart: cartItems,
      }));
    }
  };

  const setTableNumber = (num: number) => {
    setTableNumberState(num);
  };

  const setSessionId = (id: string) => {
    setSessionIdState(id);
  };

  const setAdminUid = (uid: string) => {
    setAdminUidState(uid);
  };

  const initializeSession = (table: number, session: string, admin: string) => {
    setTableNumberState(table);
    setSessionIdState(session);
    setAdminUidState(admin);
    localStorage.setItem("customer_session", JSON.stringify({
      tableNumber: table,
      sessionId: session,
      adminUid: admin,
      cart: cart,
    }));
  };

  const addToCart = (menuItem: MenuItem) => {
    setCart((prev) => {
      const existingItem = prev.find((item) => item.menuItem.id === menuItem.id);
      let newCart: CartItem[];
      if (existingItem) {
        newCart = prev.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newCart = [...prev, { menuItem, quantity: 1 }];
      }
      saveSession(tableNumber, sessionId, adminUid, newCart);
      return newCart;
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => {
      const newCart = prev.filter((item) => item.menuItem.id !== menuItemId);
      saveSession(tableNumber, sessionId, adminUid, newCart);
      return newCart;
    });
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setCart((prev) => {
      const newCart = prev.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      );
      saveSession(tableNumber, sessionId, adminUid, newCart);
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    saveSession(tableNumber, sessionId, adminUid, []);
  };

  const getCartTotal = () => {
    return cart.reduce(
      (total, item) => total + parseFloat(item.menuItem.price) * item.quantity,
      0
    );
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const resetCustomerSession = () => {
    setTableNumberState(null);
    setSessionIdState(null);
    setAdminUidState(null);
    setCart([]);
    localStorage.removeItem("customer_session");
  };

  return (
    <CustomerContext.Provider
      value={{
        tableNumber,
        sessionId,
        adminUid,
        cart,
        setTableNumber,
        setSessionId,
        setAdminUid,
        initializeSession,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartItemCount,
        resetCustomerSession,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error("useCustomer must be used within a CustomerProvider");
  }
  return context;
}
