import { useState, useEffect } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Clock, 
  Check, 
  X, 
  ChefHat,
  AlertCircle,
  Filter
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Order, Table, OrderItem } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  accepted: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  processing: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  completed: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  processing: "Processing",
  completed: "Completed",
  rejected: "Rejected",
};

export default function AdminOrders() {
  const { adminUid } = useParams<{ adminUid: string }>();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const tableFilter = searchParams.get("table");
  
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [selectedTable, setSelectedTable] = useState<string>(tableFilter || "all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation(`/admin/${adminUid}`);
    }
  }, [authLoading, isAuthenticated, adminUid, setLocation]);

  useEffect(() => {
    if (tableFilter) {
      setSelectedTable(tableFilter);
    }
  }, [tableFilter]);

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders', adminUid],
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const { data: tables } = useQuery<Table[]>({
    queryKey: ['/api/tables', adminUid],
    enabled: isAuthenticated,
  });

  const updateOrderItemMutation = useMutation({
    mutationFn: async ({ orderId, itemIndex, status }: { orderId: string; itemIndex: number; status: string }) => {
      return apiRequest("PATCH", `/api/orders/${orderId}/items/${itemIndex}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', adminUid] });
      toast({ title: "Order item updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update order", description: error.message, variant: "destructive" });
    },
  });

  const activeTables = tables?.filter(t => t.status === 'active' || t.status === 'billing') || [];

  const filteredOrders = orders?.filter(order => {
    const matchesTable = selectedTable === "all" || order.tableNumber.toString() === selectedTable;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && order.orderStatus === "active") ||
      (statusFilter === "completed" && order.orderStatus === "completed");
    return matchesTable && matchesStatus;
  }) || [];

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const aHasPending = a.items.some(i => i.status === 'pending');
    const bHasPending = b.items.some(i => i.status === 'pending');
    if (aHasPending && !bHasPending) return -1;
    if (!aHasPending && bHasPending) return 1;
    return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
  });

  const handleAccept = (orderId: string, itemIndex: number) => {
    updateOrderItemMutation.mutate({ orderId, itemIndex, status: 'accepted' });
  };

  const handleReject = (orderId: string, itemIndex: number) => {
    updateOrderItemMutation.mutate({ orderId, itemIndex, status: 'rejected' });
  };

  const handleProcess = (orderId: string, itemIndex: number) => {
    updateOrderItemMutation.mutate({ orderId, itemIndex, status: 'processing' });
  };

  const handleComplete = (orderId: string, itemIndex: number) => {
    updateOrderItemMutation.mutate({ orderId, itemIndex, status: 'completed' });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-orders-title">Orders</h1>
        <p className="text-muted-foreground">Manage incoming orders from all tables.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedTable} onValueChange={setSelectedTable}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-table-filter">
            <SelectValue placeholder="Filter by table" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {activeTables.map((table) => (
              <SelectItem key={table.id} value={table.tableNumber.toString()}>
                Table #{table.tableNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="active" data-testid="tab-active-orders">Active</TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed-orders">Completed</TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all-orders">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {ordersLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : sortedOrders.length > 0 ? (
        <div className="space-y-4">
          {sortedOrders.map((order) => (
            <Card key={order.id} data-testid={`card-order-${order.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-base font-semibold px-3 py-1">
                      Table #{order.tableNumber}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      <Clock className="inline h-4 w-4 mr-1" />
                      {formatTime(order.createdAt!)}
                    </span>
                  </div>
                  <Badge 
                    variant={order.orderStatus === 'active' ? 'default' : 'secondary'}
                    className={order.orderStatus === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : ''}
                  >
                    {order.orderStatus === 'active' ? 'Active' : 'Completed'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/30 flex-wrap"
                      data-testid={`order-item-${order.id}-${index}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Badge variant="secondary" className="shrink-0">
                          x{item.quantity}
                        </Badge>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ₹{parseFloat(item.price).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={statusColors[item.status]}>
                          {statusLabels[item.status]}
                        </Badge>
                        
                        {item.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                              onClick={() => handleAccept(order.id, index)}
                              disabled={updateOrderItemMutation.isPending}
                              data-testid={`button-accept-${order.id}-${index}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => handleReject(order.id, index)}
                              disabled={updateOrderItemMutation.isPending}
                              data-testid={`button-reject-${order.id}-${index}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        
                        {item.status === 'accepted' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => handleProcess(order.id, index)}
                            disabled={updateOrderItemMutation.isPending}
                            data-testid={`button-process-${order.id}-${index}`}
                          >
                            <ChefHat className="h-4 w-4 mr-1" />
                            Start Processing
                          </Button>
                        )}
                        
                        {item.status === 'processing' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-green-600 hover:text-green-700"
                            onClick={() => handleComplete(order.id, index)}
                            disabled={updateOrderItemMutation.isPending}
                            data-testid={`button-complete-${order.id}-${index}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    Order Total:
                  </span>
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
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-lg mb-2">No Orders Found</CardTitle>
            <CardDescription className="text-center">
              {selectedTable !== "all" || statusFilter !== "all"
                ? "No orders match your current filters."
                : "Orders will appear here when customers place them."}
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
