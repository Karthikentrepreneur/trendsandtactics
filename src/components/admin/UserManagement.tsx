import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import UserForm from "./UserForm";
import UserList from "./UserList";
import { createUser, fetchUsers, deleteUser } from "@/services/userService";
import type { User, UserFormData } from "@/types/user";

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const fetchedUsers = await fetchUsers();
      setUsers(fetchedUsers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (data: UserFormData) => {
    try {
      await createUser(data);
      toast({
        title: "Success",
        description: "User created successfully",
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
      <Card>
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm onSubmit={handleSubmit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground">No users found.</p>
          ) : (
            <UserList users={users} onDeleteUser={handleDeleteUser} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;