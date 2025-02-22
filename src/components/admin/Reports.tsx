
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, Loader2, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          tasks:tasks(count),
          leave_requests:leave_requests(count),
          salary_information:salary_information(*)
        `);
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Employee Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees?.map((employee) => (
          <Card key={employee.id} className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/admin/employee/${employee.id}/reports`)}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                {employee.profile_photo ? (
                  <img 
                    src={employee.profile_photo} 
                    alt={employee.name} 
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-16 h-16 text-gray-400" />
                )}
                <div>
                  <h3 className="font-semibold text-lg">{employee.name}</h3>
                  <p className="text-sm text-gray-600">{employee.employee_id}</p>
                  <p className="text-sm text-gray-600">{employee.designation}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
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
                  navigate(`/admin/employee/${employee.id}/reports`);
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
