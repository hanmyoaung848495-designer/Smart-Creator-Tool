
import React, { useState, useEffect } from 'react';
import { UserAccount, UserSession } from '../types';
import { Card, Button, Input, Select, Modal, ConfirmModal } from '../components/Shared';
import { Eye, EyeOff, Trash2, UserPlus, Users, Calendar, Shield, Smartphone, Send, Clock, Search, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onBack: () => void;
  session: UserSession;
}

const AdminDashboard: React.FC<Props> = ({ onBack, session }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);

  // New User Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    startDate: new Date().toISOString().split('T')[0],
    expiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isLifetime: false,
    telegram: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const rawData = await response.json();
        const mappedData: UserAccount[] = rawData.map((u: any) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          password: u.password,
          role: u.role,
          startDate: u.start_date,
          expiredDate: u.expired_date,
          isLifetime: u.is_lifetime,
          telegram: u.telegram,
          deviceId: u.device_id,
          lastLogin: u.last_login,
          createdAt: u.created_at
        }));
        setUsers(mappedData);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      toast.error('Failed to fetch users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          startDate: new Date(formData.startDate).getTime(),
          expiredDate: formData.isLifetime ? null : new Date(formData.expiredDate).getTime(),
          isLifetime: formData.isLifetime,
          telegram: formData.telegram,
          deviceId: null
        })
      });

      if (response.ok) {
        toast.success('User added successfully');
        setShowAddModal(false);
        setFormData({
          name: '',
          username: '',
          password: '',
          role: 'user',
          startDate: new Date().toISOString().split('T')[0],
          expiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          isLifetime: false,
          telegram: ''
        });
        fetchUsers();
      } else {
        throw new Error('Failed to add user');
      }
    } catch (err) {
      toast.error('Failed to add user');
      console.error(err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      const response = await fetch(`/api/admin/users/${userToDelete.username}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (err) {
      toast.error('Failed to delete user');
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.telegram.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatus = (user: UserAccount) => {
    if (user.isLifetime) return { label: 'Lifetime', color: 'text-purple-600 bg-purple-50' };
    if (!user.expiredDate) return { label: 'Invalid', color: 'text-gray-400 bg-gray-50' };
    
    const now = Date.now();
    if (now > user.expiredDate) return { label: 'Expired', color: 'text-red-600 bg-red-50' };
    
    const daysLeft = Math.ceil((user.expiredDate - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return { label: `${daysLeft}d left`, color: 'text-amber-600 bg-amber-50' };
    
    return { label: 'Active', color: 'text-emerald-600 bg-emerald-50' };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <X size={20} />
          </Button>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Admin Dashboard</h2>
            <p className="text-sm text-gray-500 font-medium">Manage user accounts and system configuration</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6">
          <UserPlus size={18} /> Add New User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total Users</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{users.length}</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Active Licenses</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">
              {users.filter(u => u.isLifetime || (u.expiredDate && u.expiredDate > Date.now())).length}
            </p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Recently Added</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">
              {users.filter(u => Date.now() - u.createdAt < 24 * 60 * 60 * 1000).length}
            </p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, ID or Telegram..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCredentials(!showCredentials)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-blue-600 transition-colors"
            >
              {showCredentials ? <EyeOff size={16} /> : <Eye size={16} />}
              {showCredentials ? 'Hide IDs' : 'Show IDs'}
            </button>
            <Button variant="secondary" onClick={fetchUsers} className="p-2 h-10 w-10">
              <Clock size={18} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">User Information</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Account Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Details</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Device</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-bold uppercase tracking-widest text-[10px]">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <p className="font-bold uppercase tracking-widest text-[10px]">No users found</p>
                  </td>
                </tr>
              ) : filteredUsers.map((user) => {
                const status = getStatus(user);
                return (
                  <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{user.name}</span>
                        {showCredentials ? (
                          <div className="flex flex-col mt-1 space-y-0.5">
                            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 w-fit px-1.5 rounded">ID: {user.username}</span>
                            <span className="text-[10px] font-mono text-amber-600 bg-amber-50 w-fit px-1.5 rounded">PW: {user.password}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 mt-0.5 italic">Credentials Hidden</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-widest w-fit px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                           <Shield size={12} />
                           <span className="capitalize">{user.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-gray-400" />
                          <span>Exp: {user.isLifetime ? 'Unlimited' : new Date(user.expiredDate || 0).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Send size={12} className="text-sky-500" />
                          <span>{user.telegram || 'Not set'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          <Smartphone size={12} />
                          {user.deviceId ? <span className="text-gray-600 dark:text-gray-300">Bound</span> : <span>Available</span>}
                        </div>
                        {user.deviceId && (
                          <span className="text-[8px] font-mono text-gray-400 truncate max-w-[100px]">{user.deviceId}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setUserToDelete(user)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add User Account">
        <form onSubmit={handleAddUser} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Full Name" 
              placeholder="e.g. Kyaw Kyaw" 
              value={formData.name} 
              onChange={(val) => setFormData({...formData, name: val})} 
              className="md:col-span-2"
            />
            <Input 
              label="Username / ID" 
              placeholder="e.g. user_001" 
              value={formData.username} 
              onChange={(val) => setFormData({...formData, username: val})} 
            />
            <Input 
              label="Password" 
              type="password"
              placeholder="Enter password" 
              value={formData.password} 
              onChange={(val) => setFormData({...formData, password: val})} 
            />
            <Select 
              label="Role" 
              value={formData.role} 
              onChange={(val) => setFormData({...formData, role: val as any})} 
              options={[
                { label: 'Standard User', value: 'user' },
                { label: 'Administrator', value: 'admin' }
              ]}
            />
            <Input 
              label="Telegram (Contact)" 
              placeholder="@username or phone" 
              value={formData.telegram} 
              onChange={(val) => setFormData({...formData, telegram: val})} 
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">License Type</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lifetime</span>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, isLifetime: !formData.isLifetime})}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.isLifetime ? 'bg-purple-600' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isLifetime ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Start Date" 
                type="date"
                value={formData.startDate} 
                onChange={(val) => setFormData({...formData, startDate: val})} 
              />
              {!formData.isLifetime && (
                <Input 
                  label="Expired Date" 
                  type="date"
                  value={formData.expiredDate} 
                  onChange={(val) => setFormData({...formData, expiredDate: val})} 
                />
              )}
            </div>
          </div>

          <Button type="submit" className="w-full py-4 mt-4 shadow-xl">
            Create Account
          </Button>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete User Account"
        message={`Are you sure you want to delete ${userToDelete?.name}'s account? This action cannot be undone.`}
        confirmText="Delete Account"
        variant="danger"
      />
    </div>
  );
};

export default AdminDashboard;
