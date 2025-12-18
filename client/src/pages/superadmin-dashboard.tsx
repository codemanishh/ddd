import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Pencil, Trash2, LogOut, Store, Users, Calendar, ExternalLink } from "lucide-react";

interface Restaurant {
  id: string;
  adminUid: string;
  restaurantName: string;
  email: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  tableCount: number;
  createdAt: string;
}

export default function SuperAdminDashboard() {
  const { superAdminUid } = useParams<{ superAdminUid: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  
  const [formData, setFormData] = useState({
    adminUid: "",
    restaurantName: "",
    email: "",
    phone: "",
    address: "",
    gstNumber: "",
    tableCount: 10,
    password: "",
  });

  const token = localStorage.getItem("superAdminToken");

  useEffect(() => {
    if (!token) {
      navigate(`/superadmin/${superAdminUid}`);
    }
  }, [token, navigate, superAdminUid]);

  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["superadmin-restaurants"],
    queryFn: async () => {
      const response = await fetch("/api/superadmin/restaurants", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch restaurants");
      return response.json();
    },
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/superadmin/restaurants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create restaurant");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-restaurants"] });
      toast({ title: "Success", description: "Restaurant created successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ adminUid, data }: { adminUid: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/superadmin/restaurants/${adminUid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update restaurant");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-restaurants"] });
      toast({ title: "Success", description: "Restaurant updated successfully" });
      setEditingRestaurant(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (adminUid: string) => {
      const response = await fetch(`/api/superadmin/restaurants/${adminUid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete restaurant");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-restaurants"] });
      toast({ title: "Success", description: "Restaurant and all related data deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      adminUid: "",
      restaurantName: "",
      email: "",
      phone: "",
      address: "",
      gstNumber: "",
      tableCount: 10,
      password: "",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("superAdminToken");
    localStorage.removeItem("superAdmin");
    navigate(`/superadmin/${superAdminUid}`);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.adminUid || !formData.restaurantName || !formData.email || !formData.password) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant) return;
    const updateData: Partial<typeof formData> = {
      restaurantName: formData.restaurantName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      gstNumber: formData.gstNumber,
      tableCount: formData.tableCount,
    };
    if (formData.password) {
      updateData.password = formData.password;
    }
    updateMutation.mutate({ adminUid: editingRestaurant.adminUid, data: updateData });
  };

  const openEditDialog = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      adminUid: restaurant.adminUid,
      restaurantName: restaurant.restaurantName,
      email: restaurant.email,
      phone: restaurant.phone || "",
      address: restaurant.address || "",
      gstNumber: restaurant.gstNumber || "",
      tableCount: restaurant.tableCount,
      password: "",
    });
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <header className="bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Super Admin Panel</h1>
              <p className="text-sm text-gray-400">Restaurant Management System</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="border-gray-600 text-gray-300 hover:bg-gray-700">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">All Restaurants</h2>
            <p className="text-gray-400">{restaurants.length} restaurants onboarded</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" /> Add Restaurant
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle>Onboard New Restaurant</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Fill in the details to add a new restaurant to the system
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Admin ID *</Label>
                    <Input
                      placeholder="e.g., golden-pub"
                      value={formData.adminUid}
                      onChange={(e) => setFormData({ ...formData, adminUid: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Password *</Label>
                    <Input
                      type="password"
                      placeholder="Min 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Restaurant Name *</Label>
                  <Input
                    placeholder="e.g., The Golden Pub"
                    value={formData.restaurantName}
                    onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Email *</Label>
                  <Input
                    type="email"
                    placeholder="restaurant@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Phone</Label>
                    <Input
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Table Count</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.tableCount}
                      onChange={(e) => setFormData({ ...formData, tableCount: parseInt(e.target.value) || 10 })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Address</Label>
                  <Input
                    placeholder="Full address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">GST Number</Label>
                  <Input
                    placeholder="Optional"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="border-gray-600 text-gray-300">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={createMutation.isPending} className="bg-violet-600 hover:bg-violet-700">
                    {createMutation.isPending ? "Creating..." : "Create Restaurant"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading restaurants...</div>
        ) : restaurants.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="text-center py-12">
              <Store className="w-12 h-12 mx-auto text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Restaurants Yet</h3>
              <p className="text-gray-400 mb-4">Get started by adding your first restaurant</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="bg-gray-800/50 border-gray-700 hover:border-violet-500/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white">{restaurant.restaurantName}</CardTitle>
                      <CardDescription className="text-gray-400">
                        ID: {restaurant.adminUid}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-violet-500/20 text-violet-300 border-0">
                      {restaurant.tableCount} tables
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>Email: {restaurant.email}</p>
                    {restaurant.phone && <p>Phone: {restaurant.phone}</p>}
                    {restaurant.address && <p>Address: {restaurant.address}</p>}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    Created: {new Date(restaurant.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                      onClick={() => window.open(`/admin/${restaurant.adminUid}`, "_blank")}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Dialog open={editingRestaurant?.id === restaurant.id} onOpenChange={(open) => !open && setEditingRestaurant(null)}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          onClick={() => openEditDialog(restaurant)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Edit Restaurant</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Update restaurant details
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-gray-300">Admin ID</Label>
                            <Input value={formData.adminUid} disabled className="bg-gray-700 border-gray-600 text-gray-400" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-300">Restaurant Name</Label>
                            <Input
                              value={formData.restaurantName}
                              onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-300">Email</Label>
                            <Input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-gray-300">Phone</Label>
                              <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-gray-300">Table Count</Label>
                              <Input
                                type="number"
                                min={1}
                                value={formData.tableCount}
                                onChange={(e) => setFormData({ ...formData, tableCount: parseInt(e.target.value) || 10 })}
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-300">Address</Label>
                            <Input
                              value={formData.address}
                              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-300">GST Number</Label>
                            <Input
                              value={formData.gstNumber}
                              onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-300">New Password (leave blank to keep current)</Label>
                            <Input
                              type="password"
                              placeholder="Min 6 characters"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button type="button" variant="outline" className="border-gray-600 text-gray-300">
                                Cancel
                              </Button>
                            </DialogClose>
                            <Button type="submit" disabled={updateMutation.isPending} className="bg-violet-600 hover:bg-violet-700">
                              {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-800 border-gray-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Delete Restaurant?</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            This will permanently delete "{restaurant.restaurantName}" and ALL related data including:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>All menu items</li>
                              <li>All tables</li>
                              <li>All orders</li>
                              <li>All bills</li>
                              <li>All sales history</li>
                            </ul>
                            <p className="mt-2 font-semibold text-red-400">This action cannot be undone.</p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-gray-600 text-gray-300">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(restaurant.adminUid)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deleteMutation.isPending ? "Deleting..." : "Delete Restaurant"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
