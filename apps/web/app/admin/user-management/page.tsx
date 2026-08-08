"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SearchInput, Button, Label, Separator, Checkbox, Input, ConfirmationDialog, Badge } from "@repo/ui";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Filter, ChevronDown, Edit } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@repo/ui/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { DataTable, type TableColumn } from "../../../components/data-table";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { RoleGuard } from "../../../components/guards/RoleGuard";
import { userService } from "../../../lib/api/services";
import { toast } from '../../../lib/toast';
import { validateEmail, validatePhoneOptional, validateName } from '../../../lib/validation';
import { SkeletonLine, TableSkeleton, ToolbarSkeleton } from "../../../components/skeletons";
import { UserFilterBadges } from "../../../components/user-filter-badges";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/components/ui/dropdown-menu";
import { useUsersWithPagination, userKeys } from "../../../hooks/useUsers";

type User = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone?: string;
  role: string;
  region?: string;
  location?: string;
  createdAt: string;
};

// Helper function to format region for display
const formatRegion = (region?: string): string => {
  if (!region) return '-';
  const regionMap: Record<string, string> = {
    'SOUTH': 'South',
    'NORTH': 'North',
    'EAST': 'East',
    'WEST_1': 'West 1',
    'WEST_2': 'West 2',
    'APTOC': 'APTOC',
  };
  return regionMap[region] || region;
};

// Remove mock data - we'll use real API data

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "SALES", region: "", location: "" });
  const [editingUser, setEditingUser] = useState<{ id: string; firstName: string; lastName: string; email: string; phone: string; role: string; region: string; location: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ firstName?: string; lastName?: string; email?: string; phone?: string; region?: string }>({});
  const [touchedFields, setTouchedFields] = useState<Set<'firstName' | 'lastName' | 'email' | 'phone' | 'region'>>(new Set());

  // Filter state
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>(undefined);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: Array<{ row: number; firstName: string; lastName: string; email: string; error: string }>;
    report?: { filename: string; mimeType: string; base64: string };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Proactive validation for all form fields
  const computedErrors = useMemo(() => {
    const e: Partial<Record<'firstName' | 'lastName' | 'email' | 'phone' | 'region', string>> = {};

    const firstNameValidation = validateName(newUser.firstName);
    if (!firstNameValidation.isValid) e.firstName = firstNameValidation.error;

    const lastNameValidation = validateName(newUser.lastName);
    if (!lastNameValidation.isValid) e.lastName = lastNameValidation.error;

    const emailValidation = validateEmail(newUser.email);
    if (!emailValidation.isValid) e.email = emailValidation.error;

    if (newUser.phone.trim()) {
      const phoneValidation = validatePhoneOptional(newUser.phone);
      if (!phoneValidation.isValid) e.phone = phoneValidation.error;
    }

    // Region is optional for all users

    return e;
  }, [newUser.firstName, newUser.lastName, newUser.email, newUser.phone, newUser.region, newUser.role]);

  // Proactive validation for edit form fields
  const computedEditErrors = useMemo(() => {
    if (!editingUser) return {};
    const e: Partial<Record<'firstName' | 'lastName' | 'email' | 'phone' | 'region', string>> = {};

    const firstNameValidation = validateName(editingUser.firstName);
    if (!firstNameValidation.isValid) e.firstName = firstNameValidation.error;

    const lastNameValidation = validateName(editingUser.lastName);
    if (!lastNameValidation.isValid) e.lastName = lastNameValidation.error;

    const emailValidation = validateEmail(editingUser.email);
    if (!emailValidation.isValid) e.email = emailValidation.error;

    if (editingUser.phone.trim()) {
      const phoneValidation = validatePhoneOptional(editingUser.phone);
      if (!phoneValidation.isValid) e.phone = phoneValidation.error;
    }

    // Region is optional for all users

    return e;
  }, [editingUser]);

  // Only show errors for touched fields
  const displayErrors = useMemo(() => {
    const display: Partial<Record<'firstName' | 'lastName' | 'email' | 'phone' | 'region', string>> = {};
    for (const field of ['firstName', 'lastName', 'email', 'phone', 'region'] as const) {
      if (touchedFields.has(field) && computedErrors[field]) {
        display[field] = computedErrors[field];
      }
    }
    return display;
  }, [computedErrors, touchedFields]);

  // Display errors for edit form
  const displayEditErrors = useMemo(() => {
    const display: Partial<Record<'firstName' | 'lastName' | 'email' | 'phone' | 'region', string>> = {};
    for (const field of ['firstName', 'lastName', 'email', 'phone', 'region'] as const) {
      if (touchedFields.has(field) && computedEditErrors[field]) {
        display[field] = computedEditErrors[field];
      }
    }
    return display;
  }, [computedEditErrors, touchedFields]);

  const hasErrors = Object.keys(computedErrors).length > 0;
  const hasEditErrors = Object.keys(computedEditErrors).length > 0;

  // Fetch users with pagination
  const userFilters = useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    role: selectedRole,
    region: selectedRegion,
  }), [currentPage, itemsPerPage, selectedRole, selectedRegion]);

  const { 
    data: users = [], 
    pagination,
    isLoading: loading,
    error: usersError 
  } = useUsersWithPagination(userFilters);

  // Map users to the format expected by the component (innovunglobal.com users are filtered by backend)
  const mappedUsers = useMemo(() => {
    return users.map((u) => ({
      id: u.id.toString(),
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email,
      phone: u.phone || '',
      role: String(u.role || ''),
      region: u.region || '',
      location: (u as any).location || '',
      createdAt: typeof u.createdAt === 'string' ? u.createdAt : new Date(u.createdAt as any).toISOString(),
    }));
  }, [users]);

  // Filter users based on search query (client-side for now)
  const filtered = useMemo(() => {
    let filteredUsers = mappedUsers;

    // Apply search query (client-side filtering)
    const q = query.trim().toLowerCase();
    if (q) {
      filteredUsers = filteredUsers.filter((user) => {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').toLowerCase();
        const nameMatch = fullName.includes(q);
        const emailMatch = user.email.toLowerCase().includes(q);
        const roleMatch = user.role.toLowerCase().includes(q);
        const phoneMatch = user.phone?.toLowerCase().includes(q) || false;
        const regionMatch = formatRegion(user.region).toLowerCase().includes(q);
        const createdAtMatch = new Date(user.createdAt).toLocaleDateString().toLowerCase().includes(q);

        return nameMatch || emailMatch || roleMatch || phoneMatch || regionMatch || createdAtMatch;
      });
    }

    // Ensure SYSTEM_ADMIN stays first even after filtering
    return filteredUsers.sort((a, b) => {
      if (a.role === 'SYSTEM_ADMIN' && b.role !== 'SYSTEM_ADMIN') return -1;
      if (a.role !== 'SYSTEM_ADMIN' && b.role === 'SYSTEM_ADMIN') return 1;
      return 0;
    });
  }, [query, mappedUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRole, selectedRegion]);

  // Derive error message from hook error
  const errorMessage = useMemo(() => {
    if (usersError) {
      return (usersError as any)?.message || (usersError as any)?.error || 'Failed to load users';
    }
    return null;
  }, [usersError]);

  const handleCreateUser = async () => {
    // Validate before submission
    const firstNameValidation = validateName(newUser.firstName);
    const lastNameValidation = validateName(newUser.lastName);
    const emailValidation = validateEmail(newUser.email);
    const phoneValidation = validatePhoneOptional(newUser.phone);

    const errors: { firstName?: string; lastName?: string; email?: string; phone?: string; region?: string } = {};
    if (!firstNameValidation.isValid) errors.firstName = firstNameValidation.error;
    if (!lastNameValidation.isValid) errors.lastName = lastNameValidation.error;
    if (!emailValidation.isValid) errors.email = emailValidation.error;
    if (!phoneValidation.isValid) errors.phone = phoneValidation.error;
    // Region is optional for all users

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return; // Don't submit if validation fails
    }

    try {
      setCreating(true);
      const op = userService.createUser(newUser as any);
      toast.promise(op, {
        loading: 'Creating new user...',
        success: 'User created successfully! Login credentials have been sent to their email.',
        error: (error: any) => {
          const title = error?.response?.data?.error || 'Failed to create user';
          const details = error?.response?.data?.details || error?.message;
          return details && details !== title ? `${title}: ${details}` : title;
        },
      });

      const createdUser = await op;

      // Invalidate queries to refetch users
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });

      setNewUser({ firstName: '', lastName: '', email: '', phone: '', role: 'SALES', region: '', location: '' });
      setValidationErrors({});
      setTouchedFields(new Set());
      setIsCreateModalOpen(false);
    } catch (_err) {
      // Error toast handled by toast.promise above
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser({
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      region: user.region || '',
      location: user.location || '',
    });
    setValidationErrors({});
    setTouchedFields(new Set());
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    // Validate before submission
    const firstNameValidation = validateName(editingUser.firstName);
    const lastNameValidation = validateName(editingUser.lastName);
    const emailValidation = validateEmail(editingUser.email);
    const phoneValidation = validatePhoneOptional(editingUser.phone);

    const errors: { firstName?: string; lastName?: string; email?: string; phone?: string; region?: string } = {};
    if (!firstNameValidation.isValid) errors.firstName = firstNameValidation.error;
    if (!lastNameValidation.isValid) errors.lastName = lastNameValidation.error;
    if (!emailValidation.isValid) errors.email = emailValidation.error;
    if (!phoneValidation.isValid) errors.phone = phoneValidation.error;
    // Region is optional for all users

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return; // Don't submit if validation fails
    }

    try {
      setUpdating(true);
      const { id, role, ...userData } = editingUser;
      const op = userService.updateUser(parseInt(id), userData as any);
      toast.promise(op, {
        loading: 'Updating user...',
        success: 'User updated successfully!',
        error: (error: any) => {
          const title = error?.response?.data?.error || 'Failed to update user';
          const details = error?.response?.data?.details || error?.message;
          return details && details !== title ? `${title}: ${details}` : title;
        },
      });

      await op;

      // Invalidate queries to refetch users
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });

      setEditingUser(null);
      setValidationErrors({});
      setTouchedFields(new Set());
      setIsEditModalOpen(false);
    } catch (_err) {
      // Error toast handled by toast.promise above
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      // Filter out SYSTEM_ADMIN users from deletion
      const usersToDelete = selectedUsers.filter(userId => {
        const user = mappedUsers.find(u => u.id === userId);
        return user && user.role !== 'SYSTEM_ADMIN';
      });
      
      const count = usersToDelete.length;
      if (count === 0) {
        toast.error('System admin users cannot be deleted');
        setSelectedUsers([]);
        setIsDeleteModalOpen(false);
        return;
      }

      const op = Promise.all(
        usersToDelete.map(userId => userService.deleteUser(parseInt(userId)))
      );

      toast.promise(op, {
        loading: `Deleting ${count} user${count > 1 ? 's' : ''}...`,
        success: `Successfully deleted ${count} user${count > 1 ? 's' : ''}`,
        error: (error: any) => {
          const raw = error?.response?.data;
          const title = raw?.error || 'Failed to delete selected users';
          const details = raw?.details || error?.message || raw?.field;

          // Friendly mapping for common FK cases
          const code = raw?.code;
          const field = String(raw?.field || '').toLowerCase();
          const message = String(details || '').toLowerCase();

          if (code === 'FOREIGN_KEY_CONSTRAINT') {
            // Specific reported case from logs
            if (details && String(details).includes('lead_assignment_rules_assigned_user_id_fkey')) {
              return 'Cannot delete user: they are the assignee for existing leads. Please reassign those leads first.';
            }
            if (field.includes('lead_assignment_rules') || message.includes('lead assignment')) {
              return 'Cannot delete user: they are the assignee for existing leads. Please reassign those leads first.';
            }
            if (field.includes('owner') || message.includes('owner')) {
              return 'Cannot delete user: they are the assignee for existing leads. Please reassign those leads first.';
            }
          }

          return details && details !== title ? `${title}: ${details}` : title;
        },
      });

      await op;

      // Invalidate queries to refetch users
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      setSelectedUsers([]);
      setIsDeleteModalOpen(false);
    } catch (_err) {
      // Error toast handled by toast.promise
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.csv', '.xlsx'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validTypes.includes(ext)) {
      toast.error('Please upload a CSV or Excel (.xlsx) file');
      return;
    }

    setImportFile(file);
    setImportResult(null);
  };

  const handleImportUsers = async () => {
    if (!importFile) {
      toast.error('Please select a file to import');
      return;
    }

    setImporting(true);
    try {
      const result = await userService.importUsersFile(importFile);
      setImportResult({
        success: result.success.length,
        errors: result.errors,
        report: result.report,
      });

      if (result.success.length > 0) {
        toast.success(`Successfully imported ${result.success.length} user(s)`);
        // Invalidate queries to refetch users
        queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      }

      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} row(s) failed to import`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to import users');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!importResult?.report) return;

    const { filename, base64, mimeType } = importResult.report;
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = async (format: 'xlsx' | 'csv') => {
    try {
      // Get auth token for the download
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];

      const endpoint = format === 'csv'
        ? '/api/users/import/template/download/csv'
        : '/api/users/import/template/download';

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-import-template.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download template');
    }
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    // Prevent selecting SYSTEM_ADMIN users
    const user = mappedUsers.find(u => u.id === userId);
    if (user && user.role === 'SYSTEM_ADMIN') {
      return; // Don't allow selection of SYSTEM_ADMIN
    }
    
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select users that are not SYSTEM_ADMIN
      setSelectedUsers(filtered.filter(user => user.role !== 'SYSTEM_ADMIN').map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const columns: TableColumn<User>[] = useMemo(
    () => [
      { key: "name", label: "Name", render: (_v, item) => <span className="text-muted-foreground py-4">{[item.firstName, item.lastName].filter(Boolean).join(' ') || '-'}</span> },
      { key: "email", label: "Email", render: (_v, item) => <span className="text-muted-foreground py-4">{item.email}</span> },
      { key: "phone", label: "Phone", render: (_v, item) => <span className="text-muted-foreground py-4">{item.phone || '-'}</span> },
      {
        key: "role",
        label: "Role",
        render: (_v, item) => (
          <Badge 
            variant="secondary" 
            className={
              item.role === 'SYSTEM_ADMIN' 
                ? 'bg-red-100 text-red-800 hover:bg-red-100' 
                : item.role === 'ADMIN' 
                ? 'bg-purple-100 text-purple-800 hover:bg-purple-100' 
                : 'bg-blue-100 text-blue-800 hover:bg-blue-100'
            }
          >
            {item.role}
          </Badge>
        )
      },
      {
        key: "region",
        label: "Region",
        render: (_v, item) => (
          <Badge variant="outline" className="text-muted-foreground">
            {formatRegion(item.region)}
          </Badge>
        )
      },
      {
        key: "location",
        label: "Location",
        render: (_v, item) => <span className="text-muted-foreground py-4">{item.location || '-'}</span>
      },
      {
        key: "createdAt",
        label: "Created At",
        render: (_v, item) => {
          const date = new Date(item.createdAt)
          const time = date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
          const dateStr = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          })
          return <span className="text-muted-foreground py-2">{`${time}, ${dateStr}`}</span>
        }
      },
      {
        key: "actions",
        label: "Actions",
        render: (_v, item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditUser(item)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )
      },
    ],
    [handleEditUser]
  );

  const skeletonView = (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-72" />
        <SkeletonLine className="h-4 w-48" />
      </div>
      <div className="rounded-xl border bg-card/40 p-4 space-y-4">
        <ToolbarSkeleton />
        <TableSkeleton />
      </div>
    </div>
  );

  // Loader handling in return
  if (loading) {
    return (
      <ProtectedRoute fallback={skeletonView}>
        <RoleGuard allowedRoles={['SYSTEM_ADMIN']}>
          {skeletonView}
        </RoleGuard>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute fallback={skeletonView}>
      <RoleGuard allowedRoles={['SYSTEM_ADMIN']}>
        <div className="p-6 space-y-4">
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage users and their roles
              {query && (
                <span className="ml-2 text-sm">
                  ({filtered.length} of {pagination?.totalItems || 0} users)
                </span>
              )}
            </p>
          </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <SearchInput
              id="search"
              placeholder="Search by name, email, or date..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-[280px]"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              >
                ×
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedUsers.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Delete Selected ({selectedUsers.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import Users
          </Button>
          <Button variant="default" onClick={() => setIsCreateModalOpen(true)}>
            Create User
          </Button>
        </div>
      </div>

      <Separator />

          {filtered.length === 0 && (query || selectedRole || selectedRegion) ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No users found
                {query && ` matching "${query}"`}
                {selectedRole && ` with role "${selectedRole}"`}
                {selectedRegion && ` in region "${formatRegion(selectedRegion)}"`}
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                {query && (
                  <Button
                    variant="outline"
                    onClick={() => setQuery("")}
                  >
                    Clear Search
                  </Button>
                )}
                {(selectedRole || selectedRegion) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRole(undefined);
                      setSelectedRegion(undefined);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <DataTable<User>
              data={filtered}
              columns={columns}
              title="Users"
              count={pagination?.totalItems || 0}
              currentPage={currentPage}
              totalPages={pagination?.totalPages || 1}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              showCheckboxes={true}
              selectedItems={selectedUsers}
              onSelectionChange={(ids) => {
                // Filter out SYSTEM_ADMIN users from selection
                const validIds = ids.filter(id => {
                  const user = filtered.find(u => u.id === id);
                  return user && user.role !== 'SYSTEM_ADMIN';
                });
                setSelectedUsers(validIds);
              }}
              isSearchMode={!!query}
              searchQuery={query}
              showFilter={true}
              customFilter={
                <div className="flex items-center gap-2">
                  {/* Role Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className={selectedRole ? "bg-primary/10 border-primary" : ""}>
                        <Filter className="h-4 w-4 mr-2" />
                        Role
                        {selectedRole && <span className="ml-1 h-2 w-2 bg-primary rounded-full" />}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => {
                        setSelectedRole(undefined);
                        setCurrentPage(1);
                      }}>
                        All Roles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedRole("SALES");
                        setCurrentPage(1);
                      }}>
                        SALES
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedRole("ADMIN");
                        setCurrentPage(1);
                      }}>
                        ADMIN
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedRole("SYSTEM_ADMIN");
                        setCurrentPage(1);
                      }}>
                        SYSTEM_ADMIN
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Region Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className={selectedRegion ? "bg-primary/10 border-primary" : ""}>
                        <Filter className="h-4 w-4 mr-2" />
                        Region
                        {selectedRegion && <span className="ml-1 h-2 w-2 bg-primary rounded-full" />}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => {
                        setSelectedRegion(undefined);
                        setCurrentPage(1);
                      }}>
                        All Regions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedRegion("SOUTH");
                        setCurrentPage(1);
                      }}>
                        South
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedRegion("NORTH");
                        setCurrentPage(1);
                      }}>
                        North
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedRegion("EAST");
                        setCurrentPage(1);
                      }}>
                        East
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedRegion("WEST_1");
                        setCurrentPage(1);
                      }}>
                        West 1
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedRegion("WEST_2");
                        setCurrentPage(1);
                      }}>
                        West 2
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedRegion("APTOC");
                        setCurrentPage(1);
                      }}>
                        APTOC
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              }
              filterBadges={
                <UserFilterBadges
                  selectedRole={selectedRole}
                  selectedRegion={selectedRegion}
                  onRoleRemove={() => {
                    setSelectedRole(undefined);
                    setCurrentPage(1);
                  }}
                  onRegionRemove={() => {
                    setSelectedRegion(undefined);
                    setCurrentPage(1);
                  }}
                />
              }
            />
          )}

          {/* Create User Modal */}
          <Dialog
            open={isCreateModalOpen}
            onOpenChange={(open) => {
              setIsCreateModalOpen(open);
              if (!open) {
                setNewUser({ firstName: '', lastName: '', email: '', phone: '', role: 'SALES', region: '', location: '' });
                setError(null);
                setValidationErrors({});
                setTouchedFields(new Set());
              }
            }}
          >
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system
                </DialogDescription>
              </DialogHeader>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={newUser.firstName}
                          onChange={(e) => {
                            setNewUser(prev => ({ ...prev, firstName: e.target.value }));
                            if (validationErrors.firstName) {
                              const validation = validateName(e.target.value);
                              setValidationErrors(prev => ({
                                ...prev,
                                firstName: validation.isValid ? undefined : validation.error
                              }));
                            }
                          }}
                          onBlur={() => setTouchedFields(prev => new Set(prev).add('firstName'))}
                          placeholder="First name"
                          disabled={creating}
                          aria-invalid={!!displayErrors.firstName}
                          aria-describedby={displayErrors.firstName ? "firstName-error" : undefined}
                        />
                        {displayErrors.firstName && (
                          <p id="firstName-error" className="text-xs text-red-600 mt-1">
                            {displayErrors.firstName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={newUser.lastName}
                          onChange={(e) => {
                            setNewUser(prev => ({ ...prev, lastName: e.target.value }));
                            if (validationErrors.lastName) {
                              const validation = validateName(e.target.value);
                              setValidationErrors(prev => ({
                                ...prev,
                                lastName: validation.isValid ? undefined : validation.error
                              }));
                            }
                          }}
                          onBlur={() => setTouchedFields(prev => new Set(prev).add('lastName'))}
                          placeholder="Last name"
                          disabled={creating}
                          aria-invalid={!!displayErrors.lastName}
                          aria-describedby={displayErrors.lastName ? "lastName-error" : undefined}
                        />
                        {displayErrors.lastName && (
                          <p id="lastName-error" className="text-xs text-red-600 mt-1">
                            {displayErrors.lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => {
                          setNewUser(prev => ({ ...prev, email: e.target.value }));
                          if (validationErrors.email) {
                            const validation = validateEmail(e.target.value);
                            setValidationErrors(prev => ({
                              ...prev,
                              email: validation.isValid ? undefined : validation.error
                            }));
                          }
                        }}
                        onBlur={() => setTouchedFields(prev => new Set(prev).add('email'))}
                        placeholder="Enter user email"
                        disabled={creating}
                        aria-invalid={!!displayErrors.email}
                        aria-describedby={displayErrors.email ? "email-error" : undefined}
                      />
                      {displayErrors.email && (
                        <p id="email-error" className="text-xs text-red-600 mt-1">
                          {displayErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={newUser.phone}
                        onChange={(e) => {
                          setNewUser(prev => ({ ...prev, phone: e.target.value }));
                          if (validationErrors.phone) {
                            const validation = validatePhoneOptional(e.target.value);
                            setValidationErrors(prev => ({
                              ...prev,
                              phone: validation.isValid ? undefined : validation.error
                            }));
                          }
                        }}
                        onBlur={() => setTouchedFields(prev => new Set(prev).add('phone'))}
                        placeholder="Enter phone number"
                        disabled={creating}
                        aria-invalid={!!displayErrors.phone}
                        aria-describedby={displayErrors.phone ? "phone-error" : undefined}
                      />
                      {displayErrors.phone && (
                        <p id="phone-error" className="text-xs text-red-600 mt-1">
                          {displayErrors.phone}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        type="text"
                        value={newUser.location}
                        onChange={(e) => {
                          setNewUser(prev => ({ ...prev, location: e.target.value }));
                        }}
                        placeholder="Enter location (optional)"
                        disabled={creating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="region">
                        Region
                      </Label>
                      <Select
                        value={newUser.region || "none"}
                        onValueChange={(v) => {
                          setNewUser(prev => ({ ...prev, region: v === "none" ? "" : v }));
                          setTouchedFields(prev => new Set(prev).add('region'));
                          if (validationErrors.region) {
                            setValidationErrors(prev => ({
                              ...prev,
                              region: undefined
                            }));
                          }
                        }}
                        disabled={creating}
                      >
                        <SelectTrigger className="h-9" id="region" aria-invalid={!!displayErrors.region} aria-describedby={displayErrors.region ? "region-error" : undefined}>
                          <SelectValue placeholder="Select Region (Optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Region (Optional)</SelectItem>
                          <SelectItem value="SOUTH">South</SelectItem>
                          <SelectItem value="NORTH">North</SelectItem>
                          <SelectItem value="EAST">East</SelectItem>
                          <SelectItem value="WEST_1">West 1</SelectItem>
                          <SelectItem value="WEST_2">West 2</SelectItem>
                          <SelectItem value="APTOC">APTOC</SelectItem>
                        </SelectContent>
                      </Select>
                      {displayErrors.region && (
                        <p id="region-error" className="text-xs text-red-600 mt-1">
                          {displayErrors.region}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(v) => setNewUser(prev => ({ ...prev, role: v }))}
                        disabled={creating}
                      >
                        <SelectTrigger className="h-9" id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SALES">Sales</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Note: System Admin can only be created once and cannot be created here
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
                      <p className="font-semibold">Important:</p>
                      <p>A random password will be auto-generated and sent to the Admin user's email address. Sales user will not recieve any email.</p>
                    </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setNewUser({ firstName: '', lastName: '', email: '', phone: '', role: 'SALES', region: '', location: '' });
                    setError(null);
                    setValidationErrors({});
                    setTouchedFields(new Set());
                  }}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={hasErrors || creating}
                >
                  {creating ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit User Modal */}
          <Dialog
            open={isEditModalOpen}
            onOpenChange={(open) => {
              setIsEditModalOpen(open);
              if (!open) {
                setEditingUser(null);
                setError(null);
                setValidationErrors({});
                setTouchedFields(new Set());
              }
            }}
          >
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user information
                </DialogDescription>
              </DialogHeader>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {editingUser && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-firstName">First Name *</Label>
                      <Input
                        id="edit-firstName"
                        value={editingUser.firstName}
                        onChange={(e) => {
                          setEditingUser(prev => prev ? ({ ...prev, firstName: e.target.value }) : null);
                          if (validationErrors.firstName) {
                            const validation = validateName(e.target.value);
                            setValidationErrors(prev => ({
                              ...prev,
                              firstName: validation.isValid ? undefined : validation.error
                            }));
                          }
                        }}
                        onBlur={() => setTouchedFields(prev => new Set(prev).add('firstName'))}
                        placeholder="First name"
                        disabled={updating}
                        aria-invalid={!!displayEditErrors.firstName}
                        aria-describedby={displayEditErrors.firstName ? "edit-firstName-error" : undefined}
                      />
                      {displayEditErrors.firstName && (
                        <p id="edit-firstName-error" className="text-xs text-red-600 mt-1">
                          {displayEditErrors.firstName}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-lastName">Last Name *</Label>
                      <Input
                        id="edit-lastName"
                        value={editingUser.lastName}
                        onChange={(e) => {
                          setEditingUser(prev => prev ? ({ ...prev, lastName: e.target.value }) : null);
                          if (validationErrors.lastName) {
                            const validation = validateName(e.target.value);
                            setValidationErrors(prev => ({
                              ...prev,
                              lastName: validation.isValid ? undefined : validation.error
                            }));
                          }
                        }}
                        onBlur={() => setTouchedFields(prev => new Set(prev).add('lastName'))}
                        placeholder="Last name"
                        disabled={updating}
                        aria-invalid={!!displayEditErrors.lastName}
                        aria-describedby={displayEditErrors.lastName ? "edit-lastName-error" : undefined}
                      />
                      {displayEditErrors.lastName && (
                        <p id="edit-lastName-error" className="text-xs text-red-600 mt-1">
                          {displayEditErrors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => {
                        setEditingUser(prev => prev ? ({ ...prev, email: e.target.value }) : null);
                        if (validationErrors.email) {
                          const validation = validateEmail(e.target.value);
                          setValidationErrors(prev => ({
                            ...prev,
                            email: validation.isValid ? undefined : validation.error
                          }));
                        }
                      }}
                      onBlur={() => setTouchedFields(prev => new Set(prev).add('email'))}
                      placeholder="Enter user email"
                      disabled={updating}
                      aria-invalid={!!displayEditErrors.email}
                      aria-describedby={displayEditErrors.email ? "edit-email-error" : undefined}
                    />
                    {displayEditErrors.email && (
                      <p id="edit-email-error" className="text-xs text-red-600 mt-1">
                        {displayEditErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone Number</Label>
                    <Input
                      id="edit-phone"
                      type="tel"
                      value={editingUser.phone}
                      onChange={(e) => {
                        setEditingUser(prev => prev ? ({ ...prev, phone: e.target.value }) : null);
                        if (validationErrors.phone) {
                          const validation = validatePhoneOptional(e.target.value);
                          setValidationErrors(prev => ({
                            ...prev,
                            phone: validation.isValid ? undefined : validation.error
                          }));
                        }
                      }}
                      onBlur={() => setTouchedFields(prev => new Set(prev).add('phone'))}
                      placeholder="Enter phone number"
                      disabled={updating}
                      aria-invalid={!!displayEditErrors.phone}
                      aria-describedby={displayEditErrors.phone ? "edit-phone-error" : undefined}
                    />
                    {displayEditErrors.phone && (
                      <p id="edit-phone-error" className="text-xs text-red-600 mt-1">
                        {displayEditErrors.phone}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      type="text"
                      value={editingUser.location}
                      onChange={(e) => {
                        setEditingUser(prev => prev ? ({ ...prev, location: e.target.value }) : null);
                      }}
                      placeholder="Enter location (optional)"
                      disabled={updating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-region">Region</Label>
                    <Select
                      value={editingUser.region || "none"}
                      onValueChange={(v) => {
                        setEditingUser(prev => prev ? ({ ...prev, region: v === "none" ? "" : v }) : null);
                        setTouchedFields(prev => new Set(prev).add('region'));
                        if (validationErrors.region) {
                          setValidationErrors(prev => ({
                            ...prev,
                            region: undefined
                          }));
                        }
                      }}
                      disabled={updating}
                    >
                      <SelectTrigger className="h-9" id="edit-region" aria-invalid={!!displayEditErrors.region} aria-describedby={displayEditErrors.region ? "edit-region-error" : undefined}>
                        <SelectValue placeholder="Select Region (Optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Region (Optional)</SelectItem>
                        <SelectItem value="SOUTH">South</SelectItem>
                        <SelectItem value="NORTH">North</SelectItem>
                        <SelectItem value="EAST">East</SelectItem>
                        <SelectItem value="WEST_1">West 1</SelectItem>
                        <SelectItem value="WEST_2">West 2</SelectItem>
                        <SelectItem value="APTOC">APTOC</SelectItem>
                      </SelectContent>
                    </Select>
                    {displayEditErrors.region && (
                      <p id="edit-region-error" className="text-xs text-red-600 mt-1">
                        {displayEditErrors.region}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Role *</Label>
                    <Select
                      value={editingUser.role}
                      onValueChange={(v) => setEditingUser(prev => prev ? ({ ...prev, role: v }) : null)}
                      disabled={true}
                    >
                      <SelectTrigger className="h-9" id="edit-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SALES">Sales</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Note: User role cannot be changed after creation
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingUser(null);
                    setError(null);
                    setValidationErrors({});
                    setTouchedFields(new Set());
                  }}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateUser}
                  disabled={hasEditErrors || updating}
                >
                  {updating ? 'Updating...' : 'Update User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bulk Delete Confirmation Modal */}
          <ConfirmationDialog
            open={isDeleteModalOpen}
            onOpenChange={setIsDeleteModalOpen}
            onConfirm={handleBulkDelete}
            title="Delete Users"
            description={`Are you sure you want to delete ${selectedUsers.length} selected user(s)? This action cannot be undone.`}
            confirmText="Delete"
            variant="destructive"
          />

          {/* Import Users Modal */}
          <Dialog
            open={isImportModalOpen}
            onOpenChange={(open) => {
              setIsImportModalOpen(open);
              if (!open) {
                resetImportModal();
              }
            }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Import Users
                </DialogTitle>
                <DialogDescription>
                  Upload a CSV or Excel file to bulk import users. Required columns: First Name, Last Name, Email. Optional: Phone, Role, Region.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Download Template Buttons */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTemplate('xlsx')}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTemplate('csv')}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    CSV Template
                  </Button>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    disabled={importing}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {importFile ? (
                        <span className="text-green-600 font-medium">{importFile.name}</span>
                      ) : (
                        'Click to upload file'
                      )}
                    </span>
                    <span className="text-xs text-gray-400">
                      Supported formats: .csv, .xlsx
                    </span>
                  </label>
                </div>

                {/* Template Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <p className="font-semibold text-blue-800 mb-2">File Format:</p>
                  <code className="text-xs text-blue-700 block bg-blue-100 p-2 rounded">
                    First Name, Last Name, Email, Phone, Role, Region
                  </code>
                  <p className="text-blue-700 mt-2 text-xs">
                    • Role options: SALES, ADMIN (default: SALES)<br />
                    • Region options: SOUTH, NORTH, EAST, WEST_1, WEST_2, APTOC<br />
                    • Download the template for a pre-formatted file with dropdown lists
                  </p>
                </div>

                {/* Import Result */}
                {importResult && (
                  <div className="space-y-3">
                    {importResult.success > 0 && (
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{importResult.success} user(s) imported successfully</span>
                      </div>
                    )}
                    {importResult.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-red-700">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">{importResult.errors.length} error(s)</span>
                          </div>
                          {importResult.report && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDownloadErrorReport}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <FileSpreadsheet className="w-4 h-4 mr-1" />
                              Download Error Report
                            </Button>
                          )}
                        </div>
                        <div className="max-h-32 overflow-auto text-sm">
                          {importResult.errors.slice(0, 5).map((err, idx) => (
                            <p key={idx} className="text-red-600">
                              Row {err.row} ({err.email || 'N/A'}): {err.error}
                            </p>
                          ))}
                          {importResult.errors.length > 5 && (
                            <p className="text-red-500 mt-1 italic">
                              ... and {importResult.errors.length - 5} more errors. Download the report for full details.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    resetImportModal();
                  }}
                  disabled={importing}
                >
                  {importResult ? 'Close' : 'Cancel'}
                </Button>
                {!importResult && (
                  <Button
                    onClick={handleImportUsers}
                    disabled={!importFile || importing}
                  >
                    {importing ? 'Importing...' : 'Import Users'}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </RoleGuard>
    </ProtectedRoute>
  );
}


