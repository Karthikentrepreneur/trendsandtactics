
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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

const EmployeeReports = () => {
  const { employeeId } = useParams();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { toast } = useToast();

  const { data: employee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employeeId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['employee-stats', employeeId, month],
    enabled: !!employeeId && !!month,
    queryFn: async () => {
      const startDate = new Date(month);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      const [tasks, leaves, salary] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', employeeId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', employeeId)
          .gte('start_date', startDate.toISOString())
          .lte('end_date', endDate.toISOString()),

        supabase
          .from('salary_information')
          .select('*')
          .eq('employee_id', employeeId)
          .single()
      ]);

      return {
        tasks: tasks.data || [],
        leaves: leaves.data || [],
        salary: salary.data,
        summary: {
          completedTasks: (tasks.data || []).filter(t => t.status === 'completed').length,
          pendingTasks: (tasks.data || []).filter(t => t.status === 'pending').length,
          approvedLeaves: (leaves.data || []).filter(l => l.status === 'approved').length,
          pendingLeaves: (leaves.data || []).filter(l => l.status === 'pending').length,
          totalWorkingDays: endDate.getDate(),
          grossSalary: salary.data?.gross_salary || 0
        }
      };
    }
  });

  const generateReport = async () => {
    try {
      if (!stats || !employee) return;

      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text(`Employee Report - ${employee.name}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Month: ${format(new Date(month), 'MMMM yyyy')}`, 14, 30);
      doc.text(`Employee ID: ${employee.employee_id}`, 14, 40);

      // Summary section
      doc.text('Monthly Summary', 14, 55);
      const summary = stats.summary;
      doc.text(`Total Working Days: ${summary.totalWorkingDays}`, 14, 65);
      doc.text(`Completed Tasks: ${summary.completedTasks}`, 14, 75);
      doc.text(`Pending Tasks: ${summary.pendingTasks}`, 14, 85);
      doc.text(`Approved Leaves: ${summary.approvedLeaves}`, 14, 95);
      doc.text(`Gross Salary: ${summary.grossSalary}`, 14, 105);

      // Tasks table
      doc.text('Tasks', 14, 120);
      autoTable(doc, {
        startY: 125,
        head: [['Title', 'Status', 'Due Date']],
        body: stats.tasks.map(task => [
          task.title,
          task.status,
          task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : '-'
        ])
      });

      doc.save(`${employee.employee_id}_report_${month}.pdf`);
      
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight">
          {employee?.name}'s Report
        </h2>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-48"
        />
      </div>

      {stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span className="font-semibold">{stats.summary.completedTasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="font-semibold">{stats.summary.pendingTasks}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leaves</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Approved:</span>
                    <span className="font-semibold">{stats.summary.approvedLeaves}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="font-semibold">{stats.summary.pendingLeaves}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Salary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Gross Salary:</span>
                    <span className="font-semibold">
                      ${stats.summary.grossSalary}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.tasks.map((task) => (
                  <div key={task.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-600">
                        Due: {task.due_date ? format(new Date(task.due_date), 'PP') : 'No due date'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-sm ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={generateReport} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Generate Monthly Report
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmployeeReports;
