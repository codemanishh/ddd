import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Leaf, 
  Drumstick, 
  Cake, 
  Wine, 
  Coffee,
  UtensilsCrossed,
  ChevronRight,
  X,
  Check,
  ClipboardList,
  Sparkles,
  Loader2
} from "lucide-react";
import { useCustomer } from "@/lib/customer-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { menuCategories, subcategoryLabels } from "@shared/schema";
import type { MenuItem, Restaurant, OrderItem } from "@shared/schema";

const categoryIcons: Record<string, any> = {
  veg: Leaf,
  nonveg: Drumstick,
  cake: Cake,
  liquor: Wine,
  drinks: Coffee,
};

export default function CustomerMenu() {
  const { adminUid } = useParams<{ adminUid: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const {
    tableNumber,
    sessionId,
    cart,
    initializeSession,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemCount,
    resetCustomerSession,
  } = useCustomer();

  const [tableInput, setTableInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [showTableDialog, setShowTableDialog] = useState(!tableNumber);
  const [validationFailCount, setValidationFailCount] = useState(0);

  // Check session validity periodically
  const checkSessionValidity = useCallback(async () => {
    if (!tableNumber || !sessionId || !adminUid) return;
    
    try {
      const response = await fetch(`/api/tables/session/validate?adminUid=${adminUid}&tableNumber=${tableNumber}&sessionId=${sessionId}`);
      
      // Handle non-JSON responses (e.g., HTML error pages)
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Session validation returned non-JSON response");
        setValidationFailCount(prev => prev + 1);
        // After 3 consecutive failures, assume session is invalid
        if (validationFailCount >= 2) {
          resetCustomerSession();
          setShowTableDialog(true);
          toast({
            title: "Connection Error",
            description: "Unable to verify your session. Please enter your table number again.",
            variant: "destructive",
          });
        }
        return;
      }
      
      const data = await response.json();
      setValidationFailCount(0); // Reset fail count on successful parse
      
      if (!data.valid) {
        // Session has been invalidated (table was reset by admin)
        resetCustomerSession();
        setShowTableDialog(true);
        toast({
          title: "Session Ended",
          description: "Your table has been reset by the restaurant. Please enter your table number again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to validate session:", error);
      setValidationFailCount(prev => prev + 1);
      // After 3 consecutive failures, assume session is invalid
      if (validationFailCount >= 2) {
        resetCustomerSession();
        setShowTableDialog(true);
        toast({
          title: "Connection Error",
          description: "Unable to verify your session. Please enter your table number again.",
          variant: "destructive",
        });
      }
    }
  }, [tableNumber, sessionId, adminUid, resetCustomerSession, toast, validationFailCount]);

  // Poll for session validity every 3 seconds
  useEffect(() => {
    if (!tableNumber || !sessionId) return;
    
    const interval = setInterval(checkSessionValidity, 3000);
    return () => clearInterval(interval);
  }, [tableNumber, sessionId, checkSessionValidity]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{itemId: string; itemName: string; reason: string; item: MenuItem}>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [lastSuggestedItemId, setLastSuggestedItemId] = useState<string | null>(null);

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', adminUid],
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items/public', adminUid],
  });

  const fetchSuggestions = async (itemId: string) => {
    if (lastSuggestedItemId === itemId) return;
    
    setLoadingSuggestions(true);
    setLastSuggestedItemId(itemId);
    
    try {
      const cartItemIds = cart.map(c => c.menuItem.id);
      const response = await apiRequest<{suggestions: Array<{itemId: string; itemName: string; reason: string; item: MenuItem}>}>(
        "POST",
        "/api/suggestions",
        { adminUid, selectedItemId: itemId, cartItemIds }
      );
      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    addToCart(item);
    fetchSuggestions(item.id);
    toast({
      title: "Added to cart",
      description: `${item.name} added to your order`,
    });
  };

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const orderItems: OrderItem[] = cart.map(item => ({
        menuItemId: item.menuItem.id,
        name: item.menuItem.name,
        price: item.menuItem.price,
        quantity: item.quantity,
        status: 'pending',
      }));

      return apiRequest("POST", "/api/orders", {
        adminUid,
        sessionId,
        tableNumber,
        items: orderItems,
        orderStatus: 'active',
      });
    },
    onSuccess: () => {
      clearCart();
      setCartOpen(false);
      setOrderPlaced(true);
      setSuggestions([]);
      setLastSuggestedItemId(null);
      toast({
        title: "Order placed!",
        description: "Your order has been sent to the kitchen.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to place order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTableSubmit = async () => {
    const num = parseInt(tableInput);
    if (!num || num < 1 || (restaurant && num > restaurant.tableCount)) {
      toast({
        title: "Invalid table number",
        description: `Please enter a number between 1 and ${restaurant?.tableCount || 10}`,
        variant: "destructive",
      });
      return;
    }

    if (!otpInput || otpInput.length !== 4) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 4-digit OTP provided by restaurant staff",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await apiRequest<{ sessionId: string; isExistingSession: boolean; tableNumber: number }>(
        "POST", 
        "/api/tables/join", 
        { adminUid, tableNumber: num, otp: otpInput }
      );
      
      initializeSession(num, response.sessionId, adminUid || "");
      setShowTableDialog(false);
      setOtpInput("");
      
      if (response.isExistingSession) {
        toast({
          title: "Welcome back!",
          description: "Continuing with your existing session.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to join table",
        description: error.message || "Invalid OTP. Please get the correct OTP from restaurant staff.",
        variant: "destructive",
      });
    }
  };

  const availableItems = menuItems?.filter(item => item.isAvailable) || [];
  
  const categoryFilteredItems = selectedCategory === "all" 
    ? availableItems 
    : availableItems.filter(item => item.category === selectedCategory);

  // Get unique subcategories for the current category selection
  const availableSubcategories = Array.from(new Set(categoryFilteredItems.map(item => item.subcategory).filter(Boolean))) as string[];

  // Apply subcategory filter if selected
  const filteredItems = selectedSubcategory 
    ? categoryFilteredItems.filter(item => item.subcategory === selectedSubcategory)
    : categoryFilteredItems;

  const groupedItems = filteredItems.reduce((acc, item) => {
    const subcategory = item.subcategory || 'other';
    if (!acc[subcategory]) {
      acc[subcategory] = [];
    }
    acc[subcategory].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory(null);
  }, [selectedCategory]);

  const cartItemCount = getCartItemCount();
  const cartTotal = getCartTotal();

  if (restaurantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-6 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-lg mb-2">Restaurant Not Found</CardTitle>
            <CardDescription className="text-center">
              The restaurant you're looking for doesn't exist or the link is incorrect.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate" data-testid="text-restaurant-name">
                {restaurant.restaurantName}
              </h1>
              {tableNumber && (
                <Badge variant="secondary" className="mt-1" data-testid="badge-table-number">
                  Table #{tableNumber}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {tableNumber && (
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/user/${adminUid}/orders`)}
                  data-testid="button-view-orders"
                >
                  <ClipboardList className="h-5 w-5" />
                </Button>
              )}
              <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="relative"
                    data-testid="button-open-cart"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartItemCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {cartItemCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col">
                  <SheetHeader>
                    <SheetTitle>Your Order</SheetTitle>
                    <SheetDescription>
                      {cartItemCount > 0 
                        ? `${cartItemCount} item${cartItemCount > 1 ? 's' : ''} in cart`
                        : 'Your cart is empty'}
                    </SheetDescription>
                  </SheetHeader>
                  
                  {cart.length > 0 ? (
                    <>
                      <ScrollArea className="flex-1 my-4">
                        <div className="space-y-3 pr-4">
                          {cart.map((item) => (
                            <div 
                              key={item.menuItem.id}
                              className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/30"
                              data-testid={`cart-item-${item.menuItem.id}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{item.menuItem.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  ₹{parseFloat(item.menuItem.price).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                                  data-testid={`button-decrease-${item.menuItem.id}`}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-6 text-center font-medium">{item.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                                  data-testid={`button-increase-${item.menuItem.id}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* AI-Powered Suggestions */}
                      {(loadingSuggestions || suggestions.length > 0) && (
                        <div className="border-t pt-4 mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium">You might also like</span>
                          </div>
                          {loadingSuggestions ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-sm text-muted-foreground">Finding perfect pairings...</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {suggestions.map((suggestion) => (
                                <div
                                  key={suggestion.itemId}
                                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{suggestion.itemName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{suggestion.reason}</p>
                                    <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                      ₹{parseFloat(suggestion.item.price).toLocaleString()}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="shrink-0 border-orange-300 hover:bg-orange-100 dark:border-orange-700 dark:hover:bg-orange-900/30"
                                    onClick={() => handleAddToCart(suggestion.item)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span data-testid="text-cart-total">₹{cartTotal.toLocaleString()}</span>
                        </div>
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => {
                            if (!tableNumber || !sessionId) {
                              setCartOpen(false);
                              setShowTableDialog(true);
                              toast({
                                title: "Enter Table Details",
                                description: "Please enter your table number and OTP to place an order.",
                              });
                            } else {
                              placeOrderMutation.mutate();
                            }
                          }}
                          disabled={placeOrderMutation.isPending}
                          data-testid="button-place-order"
                        >
                          {placeOrderMutation.isPending ? "Placing Order..." : "Place Order"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Add items from the menu to get started</p>
                    </div>
                  )}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-6">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-4">
          <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-all"
            >
              All
            </TabsTrigger>
            {menuCategories.map(cat => {
              const Icon = categoryIcons[cat.value];
              const count = availableItems.filter(i => i.category === cat.value).length;
              if (count === 0) return null;
              return (
                <TabsTrigger 
                  key={cat.value} 
                  value={cat.value}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  data-testid={`tab-${cat.value}`}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {cat.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Subcategory filter buttons */}
        {availableSubcategories.length > 1 && (
          <div className="mb-6">
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                <Button
                  variant={selectedSubcategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSubcategory(null)}
                  className="whitespace-nowrap"
                  data-testid="subcategory-all"
                >
                  All
                </Button>
                {availableSubcategories.map(subcat => (
                  <Button
                    key={subcat}
                    variant={selectedSubcategory === subcat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSubcategory(subcat)}
                    className="whitespace-nowrap"
                    data-testid={`subcategory-${subcat}`}
                  >
                    {subcategoryLabels[subcat] || subcat}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {menuLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : Object.keys(groupedItems).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedItems).map(([subcategory, items]) => (
              <div key={subcategory}>
                <h2 className="text-lg font-semibold mb-4 capitalize">
                  {subcategoryLabels[subcategory] || subcategory}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {items.map((item) => {
                    const cartItem = cart.find(c => c.menuItem.id === item.id);
                    const CategoryIcon = categoryIcons[item.category] || UtensilsCrossed;
                    
                    return (
                      <Card 
                        key={item.id} 
                        className="overflow-hidden"
                        data-testid={`card-menu-item-${item.id}`}
                      >
                        <div className="flex">
                          <div className="flex-1 p-4">
                            <div className="flex items-start gap-2 mb-2">
                              <Badge 
                                variant="outline" 
                                className={item.category === 'veg' ? 'border-green-500 text-green-600' : item.category === 'nonveg' ? 'border-red-500 text-red-600' : ''}
                              >
                                <CategoryIcon className="h-3 w-3" />
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-1">{item.name}</h3>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {item.description}
                              </p>
                            )}
                            <p className="text-lg font-bold" data-testid={`text-price-${item.id}`}>
                              ₹{parseFloat(item.price).toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="w-28 flex flex-col items-center justify-center p-4 bg-muted/30">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name}
                                className="w-20 h-20 object-cover rounded-md mb-2"
                              />
                            ) : (
                              <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center mb-2">
                                <CategoryIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            
                            {cartItem ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                                  data-testid={`button-menu-decrease-${item.id}`}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center text-sm font-medium">
                                  {cartItem.quantity}
                                </span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => addToCart(item)}
                                  data-testid={`button-menu-increase-${item.id}`}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleAddToCart(item)}
                                data-testid={`button-add-to-cart-${item.id}`}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">No Items Available</CardTitle>
              <CardDescription className="text-center">
                {selectedCategory !== "all" 
                  ? "No items in this category right now."
                  : "The menu is currently empty. Please check back later."}
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </main>

      {cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:hidden">
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => setCartOpen(true)}
            data-testid="button-view-cart-mobile"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            View Cart ({cartItemCount}) - ₹{cartTotal.toLocaleString()}
          </Button>
        </div>
      )}

      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <UtensilsCrossed className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl">{restaurant.restaurantName}</DialogTitle>
            <DialogDescription>
              Enter your table number and OTP to start ordering
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Input
                type="number"
                min="1"
                max={restaurant.tableCount}
                placeholder="Table Number"
                value={tableInput}
                onChange={(e) => setTableInput(e.target.value)}
                className="text-center text-2xl h-14"
                data-testid="input-table-number"
              />
              <p className="text-sm text-muted-foreground text-center mt-2">
                Tables 1 - {restaurant.tableCount}
              </p>
            </div>
            <div>
              <Input
                type="text"
                maxLength={4}
                placeholder="Enter 4-digit OTP"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-center text-2xl h-14 tracking-widest"
                data-testid="input-otp"
              />
              <p className="text-sm text-muted-foreground text-center mt-2">
                Ask restaurant staff for OTP
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleTableSubmit}
              data-testid="button-start-ordering"
            >
              Start Ordering
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={orderPlaced} onOpenChange={setOrderPlaced}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-2">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-2xl">Order Placed!</DialogTitle>
            <DialogDescription>
              Your order has been sent to the kitchen. We'll prepare it as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-col gap-2">
            <Button 
              className="w-full"
              onClick={() => {
                setOrderPlaced(false);
                setLocation(`/user/${adminUid}/orders`);
              }}
              data-testid="button-track-order"
            >
              Track My Order
            </Button>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => setOrderPlaced(false)}
              data-testid="button-order-more"
            >
              Order More
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
