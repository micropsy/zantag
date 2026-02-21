import { useState } from "react";
import { UserRole } from "~/types";

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
                <button disabled={loadingId === u.id} className="px-3 py-1 rounded bg-slate-900 text-white" onClick={() => save(u.id)}>
                  Save
                </button>
                <button disabled={loadingId === u.id} className="px-3 py-1 rounded border" onClick={() => resetPassword(u.id)}>
                  Reset Password
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
