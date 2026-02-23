import { useState } from "react";
import { UserRole } from "~/types";
import { Button } from "~/components/ui/button";
import { Save, RotateCcw } from "lucide-react";

export function AdminUserTable({ users }: { users: { id: string; name: string | null; email: string | null; role: string }[] }) {
  const [rows, setRows] = useState(users);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const onChange = (id: string, field: "name" | "email" | "role", value: string) => {
    setRows((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
  };
  const save = async (id: string) => {
    setLoadingId(id);
    const row = rows.find((u) => u.id === id)!;
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: row.name, email: row.email, role: row.role, intent: "update" }),
    });
    setLoadingId(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    setLoadingId(id);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, intent: "delete" }),
    });
    // Remove from local list for optimistic update
    setRows(rows.filter((r) => r.id !== id));
    setLoadingId(null);
  };
  const resetPassword = async (id: string) => {
    setLoadingId(id);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, intent: "reset-password" }),
    });
    setLoadingId(null);
  };
  return (
    <div className="overflow-x-auto border rounded-xl bg-white/50">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Role</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-3">
                <input className="w-full border rounded px-2 py-1" value={u.name ?? ""} onChange={(e) => onChange(u.id, "name", e.target.value)} />
              </td>
              <td className="p-3">
                <input className="w-full border rounded px-2 py-1" value={u.email ?? ""} onChange={(e) => onChange(u.id, "email", e.target.value)} />
              </td>
              <td className="p-3">
                <select className="border rounded px-2 py-1" value={u.role} onChange={(e) => onChange(u.id, "role", e.target.value)}>
                  {Object.values(UserRole).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-3 text-right space-x-2">
                <Button 
                  size="sm"
                  disabled={loadingId === u.id} 
                  onClick={() => save(u.id)}
                >
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  disabled={loadingId === u.id} 
                  onClick={() => resetPassword(u.id)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset Password
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => remove(u.id)}
                  disabled={loadingId === u.id}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
