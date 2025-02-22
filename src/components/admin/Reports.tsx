
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
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { data: employees, isLoading: loadingEmployees } = useQuery({
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
      console.log('Fetched employees:', data);
      return data;
    }
  });

  const { data: employeeStats, isLoading: loadingStats } = useQuery({
    queryKey: ['employee-stats', selectedEmployee, month],
    enabled: !!selectedEmployee,
    queryFn: async () => {
      const startDate = new Date(month);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      const [tasks, leaves, salary] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', selectedEmployee)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', selectedEmployee)
          .gte('start_date', startDate.toISOString())
          .lte('end_date', endDate.toISOString()),
        
        supabase
          .from('salary_information')
          .select('*')
          .eq('employee_id', selectedEmployee)
          .single()
      ]);

      return {
        tasks: tasks.data || [],
        leaves: leaves.data || [],
        salary: salary.data,
      };
    }
  });

  const generateReport = async (employeeId: string) => {
    try {
      if (!employeeId) return;

      const employee = employees?.find(e => e.id === employeeId);
      if (!employee) return;

      const stats = await employeeStats;
      if (!stats) return;

      const doc = new jsPDF();

      // Title
      doc.setFontSize(16);
      doc.text(`Employee Report - ${employee.name}`, 14, 20);
      
      // Employee Info
      doc.setFontSize(12);
      doc.text(`Employee ID: ${employee.employee_id}`, 14, 30);
      doc.text(`Designation: ${employee.designation || 'N/A'}`, 14, 40);
      doc.text(`Report Period: ${format(new Date(month), 'MMMM yyyy')}`, 14, 50);

      // Tasks Summary
      doc.text('Tasks Summary', 14, 70);
      const completedTasks = stats.tasks.filter(t => t.status === 'completed').length;
      const pendingTasks = stats.tasks.filter(t => t.status === 'pending').length;
      doc.text(`Completed Tasks: ${completedTasks}`, 20, 80);
      doc.text(`Pending Tasks: ${pendingTasks}`, 20, 90);

      // Leaves Summary
      doc.text('Leave Summary', 14, 110);
      const approvedLeaves = stats.leaves.filter(l => l.status === 'approved').length;
      const pendingLeaves = stats.leaves.filter(l => l.status === 'pending').length;
      doc.text(`Approved Leaves: ${approvedLeaves}`, 20, 120);
      doc.text(`Pending Leaves: ${pendingLeaves}`, 20, 130);

      // Salary Information
      if (stats.salary) {
        doc.text('Salary Information', 14, 150);
        doc.text(`Gross Salary: ${stats.salary.gross_salary}`, 20, 160);
        doc.text(`Net Pay: ${stats.salary.net_pay}`, 20, 170);
      }

      // Tasks Table
      if (stats.tasks.length > 0) {
        autoTable(doc, {
          startY: 190,
          head: [['Task', 'Status', 'Due Date']],
          body: stats.tasks.map(task => [
            task.title,
            task.status,
            task.due_date ? format(new Date(task.due_date), 'PP') : 'N/A'
          ])
        });
      }

      doc.save(`${employee.employee_id}_report_${month}.pdf`);
      toast({
        title: "Success",
        description: "Report generated successfully"
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
    }
  };

  if (loadingEmployees) {
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
          <Card key={employee.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-4">
                {employee.profile_photo ? (
                  <img
                    src={employee.profile_photo}
                    alt={employee.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-12 h-12 text-gray-400" />
                )}
                <div>
                  <CardTitle className="text-lg">{employee.name}</CardTitle>
                  <p className="text-sm text-gray-600">{employee.employee_id}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">Tasks</p>
                  <p className="font-semibold">{employee.tasks?.[0]?.count || 0}</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <p className="text-sm text-gray-600">Leaves</p>
                  <p className="font-semibold">{employee.leave_requests?.[0]?.count || 0}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Button 
                  className="w-full"
                  onClick={() => {
                    setSelectedEmployee(employee.id);
                    generateReport(employee.id);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/admin/payroll/${employee.id}`)}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Reports;
