import { useEffect, useCallback, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Clock, 
  Check, 
  X, 
  ChefHat,
  AlertCircle,
  ArrowLeft,
  UtensilsCrossed
} from "lucide-react";
import { useCustomer } from "@/lib/customer-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import type { Order, Restaurant } from "@shared/schema";

const statusConfig: Record<string, { icon: any; label: string; color: string }> = {
  pending: { 
    icon: Clock, 
    label: "Waiting for confirmation", 
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" 
  },
  accepted: { 
    icon: Check, 
    label: "Accepted", 
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" 
  },
  processing: { 
    icon: ChefHat, 
    label: "Being prepared", 
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" 
  },
  completed: { 
    icon: Check, 
    label: "Ready", 
    color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" 
  },
  rejected: { 
    icon: X, 
    label: "Rejected", 
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" 
  },
};

export default function CustomerOrders() {
  const { adminUid } = useParams<{ adminUid: string }>();
  const [, setLocation] = useLocation();
  const { tableNumber, sessionId, resetCustomerSession } = useCustomer();
  const { toast } = useToast();

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', adminUid],
  });

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders/table', adminUid, tableNumber?.toString()],
    enabled: !!tableNumber && !!adminUid,
    refetchInterval: 3000,
  });

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
        if (validationFailCount >= 2) {
          resetCustomerSession();
          toast({
            title: "Connection Error",
            description: "Unable to verify your session. Please enter your table number again.",
            variant: "destructive",
          });
          setLocation(`/user/${adminUid}/menu`);
        }
        return;
      }
      
      const data = await response.json();
      setValidationFailCount(0);
      
      if (!data.valid) {
        // Session has been invalidated (table was reset by admin)
        resetCustomerSession();
        toast({
          title: "Session Ended",
          description: "Your table has been reset by the restaurant. Please enter your table number again.",
          variant: "destructive",
        });
        setLocation(`/user/${adminUid}/menu`);
      }
    } catch (error) {
      console.error("Failed to validate session:", error);
      setValidationFailCount(prev => prev + 1);
      if (validationFailCount >= 2) {
        resetCustomerSession();
        toast({
          title: "Connection Error",
          description: "Unable to verify your session. Please enter your table number again.",
          variant: "destructive",
        });
        setLocation(`/user/${adminUid}/menu`);
      }
    }
  }, [tableNumber, sessionId, adminUid, resetCustomerSession, toast, setLocation, validationFailCount]);

  // Poll for session validity every 3 seconds
  useEffect(() => {
    if (!tableNumber || !sessionId) return;
    
    const interval = setInterval(checkSessionValidity, 3000);
    return () => clearInterval(interval);
  }, [tableNumber, sessionId, checkSessionValidity]);

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!tableNumber || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-lg mb-2">No Active Session</CardTitle>
            <CardDescription className="text-center mb-4">
              Please enter your table number first to view orders.
            </CardDescription>
            <Button onClick={() => setLocation(`/user/${adminUid}/menu`)} data-testid="button-go-to-menu">
              Go to Menu
            </Button>
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
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation(`/user/${adminUid}/menu`)}
                data-testid="button-back-to-menu"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold truncate">
                  {restaurant?.restaurantName || "Restaurant"}
                </h1>
                <Badge variant="secondary" className="mt-1">
                  Table #{tableNumber}
                </Badge>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-4" data-testid="text-orders-title">Your Orders</h2>

        {orders && orders.length > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Accepted Orders Total</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    ₹{orders
                      .flatMap(o => o.items)
                      .filter(i => ['accepted', 'processing', 'completed'].includes(i.status))
                      .reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-orange-600 dark:text-orange-400">
                      {orders.flatMap(o => o.items).filter(i => i.status === 'pending').length}
                    </p>
                    <p className="text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-blue-600 dark:text-blue-400">
                      {orders.flatMap(o => o.items).filter(i => ['accepted', 'processing'].includes(i.status)).length}
                    </p>
                    <p className="text-muted-foreground">In Progress</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {orders.flatMap(o => o.items).filter(i => i.status === 'completed').length}
                    </p>
                    <p className="text-muted-foreground">Ready</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {[...orders].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).map((order) => (
              <Card key={order.id} data-testid={`card-order-${order.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(order.createdAt!)}</span>
                    </div>
                    <Badge variant={order.orderStatus === 'active' ? 'default' : 'secondary'}>
                      {order.orderStatus === 'active' ? 'In Progress' : 'Completed'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items.map((item, index) => {
                      const status = statusConfig[item.status];
                      const StatusIcon = status?.icon || Clock;
                      
                      return (
                        <div 
                          key={index}
                          className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/30"
                          data-testid={`order-item-${order.id}-${index}`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Badge variant="secondary" className="shrink-0">
                              x{item.quantity}
                            </Badge>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                ₹{(parseFloat(item.price) * item.quantity).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          <Badge className={`shrink-0 ${status?.color || ''}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status?.label || item.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <span className="text-sm text-muted-foreground">Order Total:</span>
                    <span className="font-bold text-lg">
                      ₹{order.items
                        .filter(i => i.status !== 'rejected')
                        .reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">No Orders Yet</CardTitle>
              <CardDescription className="text-center mb-4">
                You haven't placed any orders yet.
              </CardDescription>
              <Button onClick={() => setLocation(`/user/${adminUid}/menu`)} data-testid="button-start-ordering">
                Start Ordering
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
