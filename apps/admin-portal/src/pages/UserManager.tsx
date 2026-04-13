import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Users, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
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

const roleBadgeClass: Record<string, string> = {
  'Consumer': 'bg-muted text-muted-foreground',
  'Business Owner': 'bg-blue-100 text-blue-700',
  'Content Creator': 'bg-purple-100 text-purple-700',
  'Admin': 'bg-amber-100 text-amber-700',
  'Super Admin': 'bg-red-100 text-red-700',
};

export default function UserManager() {
  const { profile: currentProfile } = useAdminAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('profiles')
      .select('id, user_id, full_name, username, role, created_at', { count: 'exact' });

    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

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

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(0); }, [search, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setSavingId(userId);
    await supabase.from('profiles').update({ role: newRole }).eq('user_id', userId);
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
    setSavingId(null);
  };

  // Super Admins can only be changed by other Super Admins
  const canEditRole = (user: UserRow) => {
    if (user.role === 'Super Admin') return false;
    return true;
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Manager</h1>
          <p className="text-muted-foreground mt-1">View and manage user roles</p>
        </div>
        <div className="text-sm text-muted-foreground">{totalCount} total users</div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or username..."
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm bg-background"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="all">All roles</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          <option value="Super Admin">Super Admin</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : users.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No users found</p>
          ) : (
            <>
              <div className="divide-y">
                {users.map((user) => (
                  <div key={user.id} className="py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{user.full_name || 'Unnamed'}</p>
                        {(user.role === 'Admin' || user.role === 'Super Admin') && (
                          <Shield className={`h-3.5 w-3.5 flex-shrink-0 ${user.role === 'Super Admin' ? 'text-red-500' : 'text-amber-500'}`} />
                        )}
                        {user.user_id === currentProfile?.user_id && (
                          <span className="text-xs text-muted-foreground">(you)</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{user.username || '(no username)'}</p>
                      <p className="text-xs text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeClass[user.role] || 'bg-muted text-muted-foreground'}`}>
                        {user.role}
                      </span>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.user_id, e.target.value as UserRole)}
                        disabled={savingId === user.user_id || !canEditRole(user)}
                        className="border rounded-md px-2 py-1 text-xs bg-background"
                      >
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {savingId === user.user_id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => p - 1)}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
