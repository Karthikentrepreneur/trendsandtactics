
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
import { attendanceService } from "@/services/attendanceService";
import type { AttendanceRecord } from "@/services/attendance/types";
import { ScrollArea } from "@/components/ui/scroll-area";

const Reports = () => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [month, setMonth] = useState("");

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, employee_id')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: employeeStats, isLoading: loadingStats } = useQuery({
    queryKey: ['employee-stats', selectedEmployee, month],
    enabled: !!selectedEmployee && !!month,
    queryFn: async () => {
      const startDate = new Date(month);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      const [attendanceLogs, tasks, leaveRequests] = await Promise.all([
        fetchAttendance(startDate, endDate),
        fetchTasks(startDate, endDate),
        fetchLeaveRequests(startDate, endDate)
      ]);

      const presentDays = attendanceLogs.filter(log => log.status === 'Present').length;
      const absentDays = attendanceLogs.filter(log => log.status === 'Absent').length;
      const halfDays = attendanceLogs.filter(log => log.status === 'Half Day').length;
      const leaveDays = leaveRequests.filter(leave => leave.status === 'approved').length;
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const pendingTasks = tasks.filter(task => task.status === 'pending').length;

      return {
        presentDays,
        absentDays,
        halfDays,
        leaveDays,
        completedTasks,
        pendingTasks,
        attendanceLogs,
        tasks,
        leaveRequests
      };
    }
  });

  const generateReport = async () => {
    try {
      if (!employeeStats) return;

      const doc = new jsPDF();
      const employee = employees?.find(e => e.id === selectedEmployee);
      
      // Add title
      doc.setFontSize(16);
      doc.text(`Monthly Report - ${employee?.name || ''}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Month: ${format(new Date(month), 'MMMM yyyy')}`, 14, 30);

      // Add summary
      doc.text('Monthly Summary', 14, 45);
      doc.text(`Present Days: ${employeeStats.presentDays}`, 14, 55);
      doc.text(`Absent Days: ${employeeStats.absentDays}`, 14, 65);
      doc.text(`Half Days: ${employeeStats.halfDays}`, 14, 75);
      doc.text(`Leave Days: ${employeeStats.leaveDays}`, 14, 85);
      doc.text(`Completed Tasks: ${employeeStats.completedTasks}`, 14, 95);
      doc.text(`Pending Tasks: ${employeeStats.pendingTasks}`, 14, 105);

      // Add attendance table
      doc.text('Attendance Records', 14, 120);
      autoTable(doc, {
        startY: 125,
        head: [['Date', 'Check In', 'Check Out', 'Status']],
        body: employeeStats.attendanceLogs.map((record: AttendanceRecord) => [
          format(new Date(record.date), 'dd/MM/yyyy'),
          record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-',
          record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-',
          record.status
        ])
      });

      const finalY1 = (doc as any).previousAutoTable.finalY;

      // Add tasks table
      doc.text('Task Records', 14, finalY1 + 20);
      autoTable(doc, {
        startY: finalY1 + 25,
        head: [['Title', 'Status', 'Due Date']],
        body: employeeStats.tasks.map((task) => [
          task.title,
          task.status,
          task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : '-'
        ])
      });

      const finalY2 = (doc as any).previousAutoTable.finalY;

      // Add leave requests table
      doc.text('Leave Requests', 14, finalY2 + 20);
      autoTable(doc, {
        startY: finalY2 + 25,
        head: [['Type', 'Start Date', 'End Date', 'Status']],
        body: employeeStats.leaveRequests.map((leave) => [
          leave.type,
          format(new Date(leave.start_date), 'dd/MM/yyyy'),
          format(new Date(leave.end_date), 'dd/MM/yyyy'),
          leave.status
        ])
      });

      doc.save(`monthly_report_${employee?.employee_id || 'unknown'}_${format(new Date(month), 'yyyy-MM')}.pdf`);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const fetchAttendance = async (startDate: Date, endDate: Date) => {
    const logs = await attendanceService.getAttendanceLogs();
    return logs.filter(log => 
      log.employeeId === selectedEmployee &&
      new Date(log.date) >= startDate &&
      new Date(log.date) <= endDate
    );
  };

  const fetchTasks = async (startDate: Date, endDate: Date) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', selectedEmployee)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    if (error) throw error;
    return data || [];
  };

  const fetchLeaveRequests = async (startDate: Date, endDate: Date) => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', selectedEmployee)
      .gte('start_date', startDate.toISOString())
      .lte('end_date', endDate.toISOString());
    if (error) throw error;
    return data || [];
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
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Employee Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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

              {employeeStats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Present Days</p>
                        <p className="text-2xl font-bold text-green-600">{employeeStats.presentDays}</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-gray-600">Absent Days</p>
                        <p className="text-2xl font-bold text-red-600">{employeeStats.absentDays}</p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-gray-600">Half Days</p>
                        <p className="text-2xl font-bold text-yellow-600">{employeeStats.halfDays}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Leave Days</p>
                        <p className="text-2xl font-bold text-blue-600">{employeeStats.leaveDays}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Completed Tasks</p>
                        <p className="text-2xl font-bold text-purple-600">{employeeStats.completedTasks}</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600">Pending Tasks</p>
                        <p className="text-2xl font-bold text-orange-600">{employeeStats.pendingTasks}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={generateReport}
                disabled={!selectedEmployee || !month || !employeeStats}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Generate Monthly Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
