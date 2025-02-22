
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
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Reports = () => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { toast } = useToast();

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      console.log('Fetching employees...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, employee_id');
      if (error) throw error;
      console.log('Fetched employees:', data);
      return data;
    }
  });

  const { data: employeeStats, isLoading: loadingStats } = useQuery({
    queryKey: ['employee-stats', selectedEmployee, month],
    enabled: !!selectedEmployee && !!month,
    queryFn: async () => {
      console.log('Fetching stats for:', selectedEmployee, month);
      const startDate = new Date(month);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      const [attendance, tasks, leaves] = await Promise.all([
        // Fetch attendance
        supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', selectedEmployee)
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString()),
        
        // Fetch tasks
        supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', selectedEmployee)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Fetch leave requests
        supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', selectedEmployee)
          .gte('start_date', startDate.toISOString())
          .lte('end_date', endDate.toISOString())
      ]);

      const stats = {
        attendance: attendance.data || [],
        tasks: tasks.data || [],
        leaves: leaves.data || [],
        summary: {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0,
          completedTasks: 0,
          pendingTasks: 0
        }
      };

      // Calculate summary
      if (attendance.data) {
        stats.summary.totalDays = attendance.data.length;
        stats.summary.presentDays = attendance.data.filter(a => a.status === 'present').length;
        stats.summary.absentDays = attendance.data.filter(a => a.status === 'absent').length;
      }

      if (leaves.data) {
        stats.summary.leaveDays = leaves.data.filter(l => l.status === 'approved').length;
      }

      if (tasks.data) {
        stats.summary.completedTasks = tasks.data.filter(t => t.status === 'completed').length;
        stats.summary.pendingTasks = tasks.data.filter(t => t.status === 'pending').length;
      }

      console.log('Generated stats:', stats);
      return stats;
    }
  });

  const generateReport = async () => {
    try {
      if (!employeeStats || !selectedEmployee) return;

      const employee = employees?.find(e => e.id === selectedEmployee);
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text(`Employee Report - ${employee?.name || ''}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Month: ${format(new Date(month), 'MMMM yyyy')}`, 14, 30);

      // Add summary
      doc.text('Monthly Summary', 14, 45);
      const summary = employeeStats.summary;
      doc.text(`Total Working Days: ${summary.totalDays}`, 14, 55);
      doc.text(`Present Days: ${summary.presentDays}`, 14, 65);
      doc.text(`Absent Days: ${summary.absentDays}`, 14, 75);
      doc.text(`Leave Days: ${summary.leaveDays}`, 14, 85);
      doc.text(`Completed Tasks: ${summary.completedTasks}`, 14, 95);
      doc.text(`Pending Tasks: ${summary.pendingTasks}`, 14, 105);

      // Add tables
      doc.setFontSize(14);
      doc.text('Attendance Details', 14, 120);
      autoTable(doc, {
        startY: 125,
        head: [['Date', 'Status']],
        body: employeeStats.attendance.map(a => [
          format(new Date(a.date), 'dd/MM/yyyy'),
          a.status
        ])
      });

      doc.save(`employee_report_${employee?.employee_id}_${month}.pdf`);
      
      toast({
        title: "Success",
        description: "Report generated successfully",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
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
      <Card>
        <CardHeader>
          <CardTitle>Employee Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee">Select Employee</Label>
                <select
                  id="employee"
                  className="w-full p-2 border rounded-md"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                >
                  <option value="">Select an employee</option>
                  {employees?.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="month">Select Month</Label>
                <Input
                  id="month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
            </div>

            {employeeStats && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Monthly Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Present Days</p>
                      <p className="text-2xl font-bold text-green-600">
                        {employeeStats.summary.presentDays}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600">Absent Days</p>
                      <p className="text-2xl font-bold text-red-600">
                        {employeeStats.summary.absentDays}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Leave Days</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {employeeStats.summary.leaveDays}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Completed Tasks</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {employeeStats.summary.completedTasks}
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-600">Pending Tasks</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {employeeStats.summary.pendingTasks}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Working Days</p>
                      <p className="text-2xl font-bold text-gray-600">
                        {employeeStats.summary.totalDays}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={generateReport}
                    className="w-full mt-6"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report PDF
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
