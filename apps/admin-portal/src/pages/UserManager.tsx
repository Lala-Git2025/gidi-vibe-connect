import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  UserPlus,
  BadgeCheck,
  MoreHorizontal,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAdminAuth } from '../contexts/AdminAuthContext';

type UserRole = 'Consumer' | 'Business Owner' | 'Content Creator' | 'Admin' | 'Super Admin';

interface UserRow {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  role: UserRole;
  created_at: string;
}

const ROLE_OPTIONS: UserRole[] = ['Consumer', 'Business Owner', 'Content Creator', 'Admin'];
const PAGE_SIZE = 25;

const ROLE_PILL: Record<UserRole, string> = {
  'Super Admin':     'ap-pill-super',
  'Admin':           'ap-pill-admin',
  'Business Owner':  'ap-pill-promo',
  'Content Creator': 'ap-pill-info',
  'Consumer':        'ap-pill-live',
};

const ROLE_FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All',             value: 'all' },
  { label: 'Consumer',        value: 'Consumer' },
  { label: 'Content Creator', value: 'Content Creator' },
  { label: 'Business Owner',  value: 'Business Owner' },
  { label: 'Admin',           value: 'Admin' },
  { label: 'Super Admin',     value: 'Super Admin' },
];

export default function UserManager() {
  const { profile: currentProfile } = useAdminAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filterCounts, setFilterCounts] = useState<Record<string, number>>({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('id, user_id, full_name, username, role, created_at', { count: 'exact' });
    if (roleFilter !== 'all') query = query.eq('role', roleFilter);
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`);
    }
    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setUsers((data as UserRow[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search, roleFilter]);

  const fetchFilterCounts = useCallback(async () => {
    const { count: total } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    const counts: Record<string, number> = { all: total ?? 0 };
    await Promise.all(
      ['Consumer', 'Content Creator', 'Business Owner', 'Admin', 'Super Admin'].map(async (r) => {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', r);
        counts[r] = count ?? 0;
      }),
    );
    setFilterCounts(counts);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  useEffect(() => {
    fetchFilterCounts();
  }, [fetchFilterCounts]);
  useEffect(() => {
    setPage(0);
  }, [search, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setSavingId(userId);
    await supabase.from('profiles').update({ role: newRole }).eq('user_id', userId);
    setUsers((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u)),
    );
    fetchFilterCounts();
    setSavingId(null);
  };

  const canEditRole = (user: UserRow) =>
    user.role !== 'Super Admin' && user.user_id !== currentProfile?.user_id;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 22,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="ap-page-eyebrow">
            User manager · {(filterCounts.all ?? 0).toLocaleString()} total
          </div>
          <h1 className="ap-page-title">Users</h1>
          <p className="ap-page-sub">
            Search, filter by role, inline-edit role + status. Server-side pagination, 25 per
            page.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ap-btn ap-btn-secondary">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button className="ap-btn ap-btn-primary">
            <UserPlus className="h-3.5 w-3.5" />
            Invite admin
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {ROLE_FILTERS.map((f) => {
          const active = f.value === roleFilter;
          const count =
            f.value === 'all' ? filterCounts.all ?? 0 : filterCounts[f.value] ?? 0;
          return (
            <button
              key={f.value}
              onClick={() => setRoleFilter(f.value)}
              className={'ap-btn ' + (active ? 'ap-btn-primary' : 'ap-btn-secondary')}
              style={{ height: 30, padding: '0 12px', fontSize: 11, gap: 8 }}
            >
              {f.label}
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  background: active ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
                  color: active ? '#fff' : '#52525B',
                  borderRadius: 4,
                  fontWeight: 700,
                }}
              >
                {count.toLocaleString()}
              </span>
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <div className="ap-search" style={{ width: 280 }}>
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search users by name or handle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="ap-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#6B7280' }}>
            No users found
          </div>
        ) : (
          <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Change role</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const fullName = u.full_name || 'Unnamed';
                const initials = fullName
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                const isCurrent = u.user_id === currentProfile?.user_id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background:
                              u.role === 'Super Admin'
                                ? 'linear-gradient(135deg,#A855F7,#7C3AED)'
                                : u.role === 'Admin'
                                ? 'linear-gradient(135deg,#FB923C,#EA580C)'
                                : 'linear-gradient(135deg,#FB923C,#EAB308)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: '#18181B',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            {fullName}
                            {(u.role === 'Admin' || u.role === 'Super Admin') && (
                              <BadgeCheck
                                className="h-3 w-3"
                                color={u.role === 'Super Admin' ? '#A855F7' : '#FB923C'}
                              />
                            )}
                            {isCurrent && (
                              <span style={{ fontSize: 10, color: '#6B7280' }}>(you)</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                            @{u.username || 'no-username'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={'ap-pill ' + ROLE_PILL[u.role]}>{u.role}</span>
                    </td>
                    <td style={{ color: '#52525B', fontSize: 12 }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.user_id, e.target.value as UserRole)}
                        disabled={savingId === u.user_id || !canEditRole(u)}
                        style={{
                          border: '1px solid #E5E7EB',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          background: '#fff',
                        }}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                        {u.role === 'Super Admin' && (
                          <option value="Super Admin">Super Admin</option>
                        )}
                      </select>
                      {savingId === u.user_id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground inline ml-2" />
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="ap-btn ap-btn-ghost ap-btn-icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 14,
          }}
        >
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} · page {page + 1} /{' '}
            {totalPages}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="ap-btn ap-btn-secondary ap-btn-icon"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span
              style={{
                fontSize: 12,
                color: '#6B7280',
                alignSelf: 'center',
                padding: '0 10px',
              }}
            >
              Page {page + 1}
            </span>
            <button
              className="ap-btn ap-btn-secondary ap-btn-icon"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
