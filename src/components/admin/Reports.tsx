
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Reports = () => {
  const navigate = useNavigate();

  const { data: employees, isLoading, error } = useQuery({
    queryKey: ['reports-employees'],
    queryFn: async () => {
      console.log('Fetching employees for reports...');
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          employee_id,
          designation,
          profile_photo,
          role,
          tasks:tasks(count),
          leave_requests:leave_requests(count)
        `);
      
      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }

      // Filter out non-employee profiles (e.g., admins)
      const employeeProfiles = data?.filter(profile => profile.role === 'employee') || [];
      console.log('Fetched employees:', employeeProfiles);
      return employeeProfiles;
    },
    meta: {
      onError: () => {
        toast.error("Failed to load employee data");
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <h2 className="text-3xl font-bold tracking-tight mb-6">Employee Reports</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">Error loading employee data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employees || employees.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <h2 className="text-3xl font-bold tracking-tight mb-6">Employee Reports</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">No employees found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Employee Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((employee) => (
          <Card 
            key={employee.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/admin/employee-dashboard/${employee.id}`)}
          >
            <CardHeader>
              <div className="flex items-center space-x-4">
                {employee.profile_photo ? (
                  <img
                    src={employee.profile_photo}
                    alt={employee.name || ''}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-12 h-12 text-gray-400" />
                )}
                <div>
                  <CardTitle className="text-lg">{employee.name}</CardTitle>
                  <p className="text-sm text-gray-600">{employee.designation}</p>
                  <p className="text-xs text-gray-500">{employee.employee_id}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">Tasks</p>
                  <p className="font-semibold">{employee.tasks?.[0]?.count || 0}</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <p className="text-sm text-gray-600">Leaves</p>
                  <p className="font-semibold">{employee.leave_requests?.[0]?.count || 0}</p>
                </div>
              </div>
              <Button 
                className="w-full mt-4"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/employee-reports/${employee.id}`);
                }}
              >
                View Reports
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Reports;
