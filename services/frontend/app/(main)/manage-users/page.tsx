"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/contexts/UserContext";
import { toast } from "sonner";
import { Shield, ShieldOff, Users } from "lucide-react";

type AppUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export default function ManageUsersPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    fetchUsers();
  }, [user, loading]);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${apiUrl}/api/v1/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setFetching(false);
    }
  };

  const updateRole = async (userId: string, newRole: string, userName: string) => {
    setUpdating(userId);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${apiUrl}/api/v1/auth/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.detail || "Failed to update role");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast.success(
        newRole === "admin"
          ? `${userName} is now an Admin`
          : `${userName} admin access removed`
      );
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-8 h-8 border-4 border-[#429ABD] border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium">Loading users...</p>
      </div>
    );
  }

  const admins = users.filter((u) => u.role === "admin");
  const recruiters = users.filter((u) => u.role !== "admin");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6" style={{ color: "#429ABD" }} />
        <h1 className="text-2xl font-bold" style={{ color: "#429ABD" }}>
          Manage Users
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-border p-4 bg-card">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="text-3xl font-bold" style={{ color: "#429ABD" }}>
            {users.length}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-card">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="text-3xl font-bold" style={{ color: "#F5A623" }}>
            {admins.length}
          </p>
        </div>
      </div>

      {admins.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#F5A623" }}>
            Admins ({admins.length})
          </h2>
          {admins.map((u) => (
            <div
              key={u.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-border bg-card gap-3"
            >
              <div className="flex flex-col">
                <p className="font-semibold text-sm text-foreground">{u.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-fit mt-1"
                  style={{ backgroundColor: "#429ABD20", color: "#429ABD" }}
                >
                  Admin
                </span>
              </div>
              {u.email.toLowerCase() !== (user?.email as string)?.toLowerCase() && (
                <button
                  onClick={() => updateRole(u.id, "recruiter", u.full_name || u.email)}
                  disabled={updating === u.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  <ShieldOff className="w-4 h-4" />
                  {updating === u.id ? "Removing..." : "Remove Admin"}
                </button>
              )}
              {u.email.toLowerCase() === (user?.email as string)?.toLowerCase() && (
                <span className="text-xs text-muted-foreground italic">You</span>
              )}
            </div>
          ))}
        </div>
      )}

      {recruiters.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Users ({recruiters.length})
          </h2>
          {recruiters.map((u) => (
            <div
              key={u.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-border bg-card gap-3"
            >
              <div className="flex flex-col">
                <p className="font-semibold text-sm text-foreground">{u.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-fit mt-1 bg-muted text-muted-foreground">
                  Recruiter
                </span>
              </div>
              <button
                onClick={() => updateRole(u.id, "admin", u.full_name || u.email)}
                disabled={updating === u.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: "#429ABD20", color: "#429ABD" }}
              >
                <Shield className="w-4 h-4" />
                {updating === u.id ? "Updating..." : "Make Admin"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}