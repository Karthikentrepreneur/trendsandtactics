
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AttendanceTable from "../employee/attendance/AttendanceTable";

const EmployeeDashboard = () => {
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

  const { data: stats, isLoading } = useQuery({
    queryKey: ['employee-stats', employeeId, month],
    enabled: !!employeeId && !!month,
    queryFn: async () => {
      const startDate = new Date(month);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      const [tasks, leaves] = await Promise.all([
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
          .lte('end_date', endDate.toISOString())
      ]);

      return {
        tasks: tasks.data || [],
        leaves: leaves.data || [],
      };
    }
  });

  const generateReport = async () => {
    try {
      if (!stats || !employee) return;

      const doc = new jsPDF();

      // Title
      doc.setFontSize(16);
      doc.text(`Monthly Report - ${employee.name}`, 14, 20);
      
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
      doc.text('Leave Requests', 14, 110);
      autoTable(doc, {
        startY: 120,
        head: [['Type', 'From', 'To', 'Status']],
        body: stats.leaves.map(leave => [
          leave.type,
          format(new Date(leave.start_date), 'PP'),
          format(new Date(leave.end_date), 'PP'),
          leave.status
        ])
      });

      // Tasks Table
      doc.addPage();
      doc.text('Tasks Details', 14, 20);
      autoTable(doc, {
        startY: 30,
        head: [['Task', 'Status', 'Due Date']],
        body: stats.tasks.map(task => [
          task.title,
          task.status,
          task.due_date ? format(new Date(task.due_date), 'PP') : 'N/A'
        ])
      });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight">
          {employee?.name}'s Dashboard
        </h2>
        <div className="flex items-center gap-4">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-48"
          />
          <Button onClick={generateReport}>
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {stats && (
        <div className="space-y-6">
          {/* Monthly Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span className="font-semibold">
                      {stats.tasks.filter(t => t.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="font-semibold">
                      {stats.tasks.filter(t => t.status === 'pending').length}
                    </span>
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
                    <span className="font-semibold">
                      {stats.leaves.filter(l => l.status === 'approved').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="font-semibold">
                      {stats.leaves.filter(l => l.status === 'pending').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Section */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {employee && <AttendanceTable userEmail={employee.email || ''} showTodayOnly={false} onViewDetails={() => {}} />}
            </CardContent>
          </Card>

          {/* Tasks Section */}
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

          {/* Leave Requests Section */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.leaves.map((leave) => (
                  <div key={leave.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{leave.type}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(leave.start_date), 'PP')} - {format(new Date(leave.end_date), 'PP')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-sm ${
                      leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                      leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
