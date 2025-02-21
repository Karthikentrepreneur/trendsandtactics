
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

const Reports = () => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  const generateReport = async () => {
    try {
      const [attendance, tasks, leaveRequests] = await Promise.all([
        fetchAttendance(),
        fetchTasks(),
        fetchLeaveRequests()
      ]);

      const doc = new jsPDF();
      const employee = employees?.find(e => e.id === selectedEmployee);
      
      // Add title
      doc.setFontSize(16);
      doc.text(`Employee Report - ${employee?.name || ''}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);

      // Add attendance table
      doc.text('Attendance Records', 14, 40);
      autoTable(doc, {
        startY: 45,
        head: [['Date', 'Check In', 'Check Out', 'Status']],
        body: attendance.map((record: any) => [
          format(new Date(record.date), 'dd/MM/yyyy'),
          record.check_in || '-',
          record.check_out || '-',
          record.status
        ])
      });

      // Add tasks table
      doc.text('Task Records', 14, doc.lastAutoTable.finalY + 20);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 25,
        head: [['Title', 'Status', 'Due Date']],
        body: tasks.map((task: any) => [
          task.title,
          task.status,
          task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : '-'
        ])
      });

      // Add leave requests table
      doc.text('Leave Requests', 14, doc.lastAutoTable.finalY + 20);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 25,
        head: [['Type', 'Start Date', 'End Date', 'Status']],
        body: leaveRequests.map((leave: any) => [
          leave.type,
          format(new Date(leave.start_date), 'dd/MM/yyyy'),
          format(new Date(leave.end_date), 'dd/MM/yyyy'),
          leave.status
        ])
      });

      doc.save(`employee_report_${employee?.employee_id || 'unknown'}.pdf`);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const fetchAttendance = async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', selectedEmployee)
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;
    return data || [];
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', selectedEmployee)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    if (error) throw error;
    return data || [];
  };

  const fetchLeaveRequests = async () => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', selectedEmployee)
      .gte('start_date', startDate)
      .lte('end_date', endDate);
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
      <Card>
        <CardHeader>
          <CardTitle>Generate Employee Report</CardTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={generateReport}
              disabled={!selectedEmployee || !startDate || !endDate}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
