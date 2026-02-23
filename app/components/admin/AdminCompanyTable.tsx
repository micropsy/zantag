import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Save, Trash2 } from "lucide-react";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  admin: { id: string; name: string | null; email: string | null } | null;
};

type AdminUser = { id: string; name: string | null; email: string | null };

export function AdminCompanyTable({ initial, admins }: { initial: OrgRow[]; admins: AdminUser[] }) {
  const [rows, setRows] = useState<OrgRow[]>(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const reload = async () => {
    const res = await fetch("/api/admin/organizations");
    if (res.ok) {
      const data = (await res.json()) as OrgRow[];
      setRows(data);
    }
  };

  const onChange = (id: string, field: "name" | "slug" | "adminId", value: string) => {
    setRows((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, [field === "adminId" ? "admin" : field]: field === "adminId" ? { id: value, name: o.admin?.name || null, email: o.admin?.email || null } : value } : o
      )
    );
  };

  const save = async (id: string) => {
    setLoadingId(id);
    const row = rows.find((o) => o.id === id)!;
    const body = { id, name: row.name, slug: row.slug, adminId: row.admin?.id || undefined };
    await fetch("/api/admin/organizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoadingId(null);
    await reload();
  };

  const remove = async (id: string) => {
    setLoadingId(id);
    await fetch(`/api/admin/organizations?id=${id}`, { method: "DELETE" });
    setLoadingId(null);
    await reload();
  };

  return (
    <div className="overflow-x-auto border rounded-xl bg-white/50">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Slug</th>
            <th className="p-3 text-left">Admin</th>
            <th className="p-3 text-left"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-3">
                <input className="w-full border rounded px-2 py-1" value={o.name} onChange={(e) => onChange(o.id, "name", e.target.value)} />
              </td>
              <td className="p-3">
                <input className="w-full border rounded px-2 py-1" value={o.slug} onChange={(e) => onChange(o.id, "slug", e.target.value)} />
              </td>
              <td className="p-3">
                <select
                  className="border rounded px-2 py-1"
                  value={o.admin?.id || ""}
                  onChange={(e) => onChange(o.id, "adminId", e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {(a.name || "Unknown") + (a.email ? ` (${a.email})` : "")}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-3 text-right space-x-2">
                <Button 
                  size="sm"
                  disabled={loadingId === o.id} 
                  onClick={() => save(o.id)}
                >
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button 
                  variant="destructive"
                  size="sm"
                  disabled={loadingId === o.id} 
                  onClick={() => remove(o.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
