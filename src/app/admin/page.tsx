"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Users, 
  CreditCard, 
  MessageSquare, 
  CheckCircle, 
  Trash2, 
  LogOut, 
  Lock, 
  DollarSign, 
  TrendingUp, 
  Loader2,
  XCircle
} from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  name?: string | null;
  isPro: boolean;
  createdAt: string;
}

interface CheckoutRow {
  id: string;
  email: string;
  amount: number;
  status: string;
  ticketId: string;
  createdAt: string;
}

interface ReviewRow {
  id: string;
  name: string;
  email: string;
  rating: number;
  text: string;
  approved: boolean;
  createdAt: string;
}

interface DashboardStats {
  totalUsers: number;
  proUsers: number;
  totalCheckouts: number;
  totalRevenue: number;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center min-h-screen text-sm text-muted-foreground">Loading…</main>}>
      <AdminPageInner />
    </Suspense>
  );
}

function AdminPageInner() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  // Login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Admin dashboard data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [checkouts, setCheckouts] = useState<CheckoutRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  
  // Promo code states
  const [adminPromoCode, setAdminPromoCode] = useState("");
  const [savingPromo, setSavingPromo] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const r = await fetch("/api/admin/auth");
      const d = await r.json();
      setAuthed(Boolean(d.authenticated));
      if (d.authenticated) {
        loadData();
      } else {
        setLoading(false);
      }
    } catch {
      setAuthed(false);
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/data");
      const d = await r.json();
      if (r.ok) {
        setStats(d.stats);
        setUsers(d.users);
        setCheckouts(d.checkouts);
        setReviews(d.reviews);
      } else {
        toast.error("Failed to load dashboard data");
      }

      // Fetch the active promo code
      const rPromo = await fetch("/api/admin/promo");
      const dPromo = await rPromo.json();
      if (rPromo.ok) {
        setAdminPromoCode(dPromo.code || "");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success("Welcome, Admin");
        setAuthed(true);
        loadData();
      } else {
        toast.error(d.error || "Login failed");
      }
    } catch {
      toast.error("Network error during login");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      toast.success("Logged out");
      setAuthed(false);
    } catch {}
  };

  const handleToggleReview = async (id: string, currentStatus: boolean) => {
    try {
      const r = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !currentStatus }),
      });
      if (r.ok) {
        toast.success(currentStatus ? "Review disapproved" : "Review approved!");
        setReviews((prev) => 
          prev.map((rev) => (rev.id === id ? { ...rev, approved: !currentStatus } : rev))
        );
      } else {
        toast.error("Failed to moderate review");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      const r = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (r.ok) {
        toast.success("Review deleted");
        setReviews((prev) => prev.filter((rev) => rev.id !== id));
      } else {
        toast.error("Failed to delete review");
      }
    } catch {
      toast.error("Network error");
    }
  };

  if (loading && authed === null) {
    return (
      <main className="flex min-h-screen flex-1 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </main>
    );
  }

  // LOGIN SCREEN
  if (!authed) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <Card className="w-full max-w-sm rounded-2xl border-border/60 p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock className="size-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Admin Login</h1>
            <p className="mt-1 text-xs text-muted-foreground">abCV Management Cockpit</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input 
                id="admin-email" 
                type="email" 
                required 
                placeholder="admin@admin.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <Input 
                id="admin-password" 
                type="password" 
                required 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-10 rounded-xl shimmer-btn">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "Authenticate"}
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  // AUTHENTICATED ADMIN DASHBOARD
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            Admin Dashboard <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-md">PRO Panel</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your SaaS checkouts, registered users, and review moderation.</p>
        </div>
        <Button onClick={handleLogout} variant="outline" size="sm" className="w-full sm:w-auto h-9 gap-1.5 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10">
          <LogOut className="size-4" /> Sign Out
        </Button>
      </div>

      {/* Stats Board & Promo Code Settings */}
      <div className="mt-6 sm:mt-8 grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="md:col-span-2 grid gap-4 grid-cols-2">
          <Card className="p-4 flex items-center gap-4 border-border/50">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
              <Users className="size-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Total Users</span>
              <p className="text-xl font-bold">{stats?.totalUsers || 0}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 border-border/50">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Premium Users</span>
              <p className="text-xl font-bold">{stats?.proUsers || 0}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 border-border/50">
            <div className="flex size-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
              <CreditCard className="size-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Total Orders</span>
              <p className="text-xl font-bold">{stats?.totalCheckouts || 0}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 border-border/50">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <DollarSign className="size-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Revenue</span>
              <p className="text-xl font-bold">${(stats?.totalRevenue || 0).toFixed(2)}</p>
            </div>
          </Card>
        </div>

        {/* Promo Code configuration Card */}
        <Card className="p-5 border-border/50 flex flex-col justify-between bg-gradient-to-br from-card to-muted/10">
          <div>
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest flex items-center gap-1">
              ⚡ Settings Panel
            </span>
            <h3 className="text-sm font-bold text-foreground mt-1">Active Promo Code</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Allows any user to unlock premium layouts and download watermarked-free PDFs for free.</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Input 
              type="text" 
              placeholder="e.g. FREEABCV" 
              className="h-9 uppercase text-center font-mono font-semibold"
              value={adminPromoCode}
              onChange={(e) => setAdminPromoCode(e.target.value)}
            />
            <Button 
              size="sm" 
              className="h-9 font-semibold px-4 shimmer-btn"
              disabled={savingPromo || !adminPromoCode.trim()}
              onClick={async () => {
                setSavingPromo(true);
                try {
                  const r = await fetch("/api/admin/promo", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code: adminPromoCode })
                  });
                  if (r.ok) {
                    toast.success("Promo code updated successfully!");
                  } else {
                    toast.error("Failed to update promo code");
                  }
                } catch {
                  toast.error("Network error");
                } finally {
                  setSavingPromo(false);
                }
              }}
            >
              {savingPromo ? <Loader2 className="size-3 animate-spin" /> : "Save"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Main Tab Controls */}
      <div className="mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full max-w-sm">
            <TabsTrigger value="users" className="flex-1 gap-1.5"><Users className="size-4" /> Users</TabsTrigger>
            <TabsTrigger value="checkouts" className="flex-1 gap-1.5"><CreditCard className="size-4" /> Checkouts</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 gap-1.5"><MessageSquare className="size-4" /> Reviews</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* USERS LIST */}
            {activeTab === "users" && (
              <Card className="overflow-hidden border-border/50 rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-muted-foreground">
                    <thead className="bg-muted/40 text-xs font-semibold text-foreground uppercase tracking-wider border-b">
                      <tr>
                        <th className="px-6 py-4">User ID</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Plan</th>
                        <th className="px-6 py-4">Registered Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-mono text-[10px] text-foreground">{u.id}</td>
                          <td className="px-6 py-4 font-medium text-foreground">{u.email}</td>
                          <td className="px-6 py-4">{u.name || "—"}</td>
                          <td className="px-6 py-4">
                            {u.isPro ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">PRO</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Free</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs">{new Date(u.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-10">No users found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* CHECKOUTS LIST */}
            {activeTab === "checkouts" && (
              <Card className="overflow-hidden border-border/50 rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-muted-foreground">
                    <thead className="bg-muted/40 text-xs font-semibold text-foreground uppercase tracking-wider border-b">
                      <tr>
                        <th className="px-6 py-4">Ticket ID</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Purchase Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {checkouts.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{c.ticketId}</td>
                          <td className="px-6 py-4 text-foreground font-medium">{c.email}</td>
                          <td className="px-6 py-4 font-semibold text-foreground">${c.amount.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">Succeeded</span>
                          </td>
                          <td className="px-6 py-4 text-xs">{new Date(c.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                      {checkouts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-10">No successful checkouts recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* REVIEWS MODERATION */}
            {activeTab === "reviews" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map((r) => (
                  <Card key={r.id} className="p-5 border-border/50 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-semibold text-foreground">{r.name}</h3>
                          <span className="text-[10px] text-muted-foreground font-mono">{r.email}</span>
                        </div>
                        <div className="flex text-amber-500">
                          {Array.from({ length: r.rating }).map((_, idx) => <span key={idx}>★</span>)}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed italic">"{r.text}"</p>
                    </div>

                    <div className="mt-5 pt-3 border-t flex justify-between items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                      
                      <div className="flex items-center gap-1.5">
                        <Button 
                          onClick={() => handleToggleReview(r.id, r.approved)} 
                          variant="ghost" 
                          size="sm" 
                          className={`h-8 px-2.5 rounded-lg text-xs gap-1 ${r.approved ? "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"}`}
                        >
                          {r.approved ? (
                            <><XCircle className="size-3.5" /> Disapprove</>
                          ) : (
                            <><CheckCircle className="size-3.5" /> Approve</>
                          )}
                        </Button>
                        <Button 
                          onClick={() => handleDeleteReview(r.id)} 
                          variant="ghost" 
                          size="icon" 
                          className="size-8 text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {reviews.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-sm text-muted-foreground">No reviews submitted yet.</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
