import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import EmployeeForm from "./EmployeeForm";
import EmployeeList from "./EmployeeList";
import { supabase } from "@/integrations/supabase/client";
import type { User, UserFormData } from "@/types/user";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const UserManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees = [], refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      console.log('Fetching all profiles...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) {
        console.error('Error fetching profiles:', error);
        throw error;
      }
      
      console.log('Fetched profiles:', data);
      return data as User[];
    }
  });

  const handleSubmit = async (data: UserFormData) => {
    try {
      setLoading(true);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: data.role,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            name: data.name,
            email: data.email,
            employee_id: data.employeeId,
            designation: data.designation,
            role: data.role,
          });

        if (profileError) throw profileError;

        toast({
          title: "Success",
          description: "Employee created successfully",
        });
        
        await queryClient.invalidateQueries({ queryKey: ['employees'] });
      }
    } catch (error) {
      console.error("Error creating employee:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create employee",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeDeleted = async () => {
    await queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
      <div className="space-y-6">
        <EmployeeForm onSubmit={handleSubmit} />
        <EmployeeList 
          employees={employees} 
          onEmployeeDeleted={handleEmployeeDeleted}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default UserManagement;
