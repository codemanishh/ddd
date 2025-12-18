import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MoreVertical,
  UtensilsCrossed,
  Leaf,
  Drumstick,
  Cake,
  Wine,
  Coffee,
  ImageIcon
} from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { menuCategories, subcategories, subcategoryLabels, insertMenuItemSchema } from "@shared/schema";
import type { MenuItem, InsertMenuItem } from "@shared/schema";

const menuItemFormSchema = insertMenuItemSchema.extend({
  price: z.string().min(1, "Price is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Price must be a positive number"
  ),
});

type MenuItemFormData = z.infer<typeof menuItemFormSchema>;

const categoryIcons: Record<string, any> = {
  veg: Leaf,
  nonveg: Drumstick,
  cake: Cake,
  liquor: Wine,
  drinks: Coffee,
};

export default function AdminMenu() {
  const { adminUid } = useParams<{ adminUid: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation(`/admin/${adminUid}`);
    }
  }, [authLoading, isAuthenticated, adminUid, setLocation]);

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      adminUid: adminUid || "",
      name: "",
      price: "",
      category: "veg",
      subcategory: "",
      description: "",
      imageUrl: "",
      ingredients: [],
      calories: undefined,
      isAvailable: true,
    },
  });

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items', adminUid],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async (data: MenuItemFormData) => {
      return apiRequest("POST", "/api/menu-items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items', adminUid] });
      toast({ title: "Menu item created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create item", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MenuItemFormData> }) => {
      return apiRequest("PATCH", `/api/menu-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items', adminUid] });
      toast({ title: "Menu item updated successfully" });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update item", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/menu-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items', adminUid] });
      toast({ title: "Menu item deleted successfully" });
      setDeleteConfirmItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete item", description: error.message, variant: "destructive" });
    },
  });

  const toggleAvailability = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      return apiRequest("PATCH", `/api/menu-items/${id}`, { isAvailable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items', adminUid] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update availability", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      form.reset({
        adminUid: item.adminUid,
        name: item.name,
        price: item.price,
        category: item.category,
        subcategory: item.subcategory || "",
        description: item.description || "",
        imageUrl: item.imageUrl || "",
        ingredients: item.ingredients || [],
        calories: item.calories || undefined,
        isAvailable: item.isAvailable,
      });
    } else {
      setEditingItem(null);
      form.reset({
        adminUid: adminUid || "",
        name: "",
        price: "",
        category: "veg",
        subcategory: "",
        description: "",
        imageUrl: "",
        ingredients: [],
        calories: undefined,
        isAvailable: true,
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: MenuItemFormData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredItems = menuItems?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const selectedCategoryValue = form.watch("category");
  const availableSubcategories = selectedCategoryValue 
    ? subcategories[selectedCategoryValue as keyof typeof subcategories] || []
    : [];

  if (authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-menu-title">Menu Management</h1>
          <p className="text-muted-foreground">Add, edit, and manage your menu items.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-add-menu-item">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-menu"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-6 w-full sm:w-auto">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            {menuCategories.map(cat => {
              const Icon = categoryIcons[cat.value];
              return (
                <TabsTrigger key={cat.value} value={cat.value} data-testid={`tab-${cat.value}`}>
                  <Icon className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">{cat.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const CategoryIcon = categoryIcons[item.category] || UtensilsCrossed;
            return (
              <Card key={item.id} className={!item.isAvailable ? "opacity-60" : ""} data-testid={`card-menu-item-${item.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.imageUrl ? (
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-muted">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                          <CategoryIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" size="sm">
                            {menuCategories.find(c => c.value === item.category)?.label}
                          </Badge>
                          {item.subcategory && (
                            <Badge variant="outline" size="sm">
                              {subcategoryLabels[item.subcategory]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-menu-item-options-${item.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(item)} data-testid={`button-edit-${item.id}`}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirmItem(item)}
                          className="text-destructive"
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xl font-bold" data-testid={`text-price-${item.id}`}>
                      ₹{parseFloat(item.price).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </span>
                      <Switch
                        checked={item.isAvailable}
                        onCheckedChange={(checked) => 
                          toggleAvailability.mutate({ id: item.id, isAvailable: checked })
                        }
                        data-testid={`switch-availability-${item.id}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-lg mb-2">No Menu Items</CardTitle>
            <CardDescription className="text-center mb-4">
              {searchQuery || selectedCategory !== "all" 
                ? "No items match your search criteria." 
                : "Get started by adding your first menu item."}
            </CardDescription>
            {!searchQuery && selectedCategory === "all" && (
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-first-item">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Item
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the details of this menu item." : "Fill in the details to add a new menu item."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Paneer Tikka" data-testid="input-item-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹) *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="e.g., 250" data-testid="input-item-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {menuCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategory</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-subcategory">
                            <SelectValue placeholder="Select subcategory" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSubcategories.map(sub => (
                            <SelectItem key={sub} value={sub}>
                              {subcategoryLabels[sub]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Brief description of the dish..."
                        className="resize-none"
                        rows={3}
                        data-testid="input-item-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." data-testid="input-item-image" />
                    </FormControl>
                    <FormDescription>Optional image URL for this item</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="calories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calories</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="e.g., 350"
                        data-testid="input-item-calories"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isAvailable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Available</FormLabel>
                      <FormDescription>
                        Is this item currently available for ordering?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-item-available"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-item"
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? "Saving..." 
                    : editingItem ? "Save Changes" : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmItem} onOpenChange={() => setDeleteConfirmItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmItem?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmItem(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteConfirmItem && deleteMutation.mutate(deleteConfirmItem.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
