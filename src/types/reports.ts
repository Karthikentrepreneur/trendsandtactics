import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { attendanceService } from "@/services/attendanceService";
import { Task, User } from "@/types/user";
import AttendanceTable from "./AttendanceTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/employee/dashboard/StatCard";
import { CalendarDays, CheckCircle2, Clock, Download, XCircle } from "lucide-react";
import { startOfMonth, endOfMonth, format, parseISO, getDay, getDaysInMonth, isAfter, isSunday } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const EmployeePerformance = () => {
  const { employeeId } = useParams();
  const [employee, setEmployee] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [analytics, setAnalytics] = useState({
    presentDays: 0,
    absentDays: 0,
    completedTasks: 0,
    pendingTasks: 0
  });
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    date_of_birth: "",
    fathers_name: "",
    mothers_name: "",
    address: "",
    contact_number: "",
    emergency_contact: ""
  });

  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy');
      options.push({ value, label });
    }
    return options;
  };

  const calculateSundaysInMonth = (year: number, month: number, endDay: number) => {
    let sundays = 0;
    for (let day = 1; day <= endDay; day++) {
      const date = new Date(year, month - 1, day);
      if (isSunday(date)) {
        sundays++;
      }
    }
    return sundays;
  };

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        // Fetch employee profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', employeeId)
          .single();

        if (profileData) {
          setEmployee(profileData);

          // Parse selected month
          const [year, month] = selectedMonth.split('-');
          const selectedDate = new Date(parseInt(year), parseInt(month) - 1);
          const startDate = startOfMonth(selectedDate);
          const endDate = endOfMonth(selectedDate);
          const today = new Date();

          // Fetch attendance logs
          const logs = await attendanceService.getAttendanceLogs();
          const monthLogs = logs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= startDate && logDate <= endDate && 
                   log.email?.toLowerCase() === profileData.email?.toLowerCase();
          });

          // Calculate attendance analytics
          const presentDays = monthLogs.filter(log => log.effectiveHours > 0).length;
          
          // Calculate days to consider for absence (up to today or end of month)
          const daysInMonth = getDaysInMonth(selectedDate);
          const lastDayToConsider = isAfter(endDate, today) ? today.getDate() : daysInMonth;
          
          // Calculate Sundays up to the last day to consider
          const sundaysCount = calculateSundaysInMonth(parseInt(year), parseInt(month), lastDayToConsider);
          const casualLeaveAllowance = 1; // One casual leave per month
          
          // Calculate absent days only up to today or end of month
          const absentDays = Math.max(0, lastDayToConsider - presentDays - sundaysCount - casualLeaveAllowance);

          // Fetch month's tasks
          const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', employeeId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });

          if (tasksData) {
            setTasks(tasksData);
            // Calculate task analytics
            const completedTasks = tasksData.filter(task => task.status === 'completed').length;
            const pendingTasks = tasksData.filter(task => task.status !== 'completed').length;

            setAnalytics({
              presentDays,
              absentDays,
              completedTasks,
              pendingTasks
            });
          }
        }
      } catch (error) {
        console.error('Error fetching employee data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchEmployeeData();
    }
  }, [employeeId, selectedMonth]);

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      if (employeeId) {
        const { data, error } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching leave requests:', error);
          return;
        }
        
        setLeaveRequests(data || []);
      }
    };

    fetchLeaveRequests();
  }, [employeeId]);

  const handleProfileUpdate = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', employeeId);

      if (error) throw error;

      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile");
    }
  };

  const generatePDF = () => {
    if (!employee) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Add title
    doc.setFontSize(16);
    doc.text(`Performance Report - ${employee.name}`, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Month: ${format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}`, pageWidth / 2, 25, { align: 'center' });

    // Add employee details
    doc.text(`Employee ID: ${employee.employee_id}`, 20, 35);
    doc.text(`Designation: ${employee.designation}`, 20, 42);

    // Add performance summary
    doc.text('Performance Summary:', 20, 55);
    doc.text(`Present Days: ${analytics.presentDays}`, 30, 62);
    doc.text(`Absent Days: ${analytics.absentDays}`, 30, 69);
    doc.text(`Completed Tasks: ${analytics.completedTasks}`, 30, 76);
    doc.text(`Pending Tasks: ${analytics.pendingTasks}`, 30, 83);

    // Fetch attendance logs for the selected month
    attendanceService.getAttendanceLogs().then((logs) => {
      const [year, month] = selectedMonth.split('-');
      const selectedDate = new Date(parseInt(year), parseInt(month) - 1);
      const startDate = startOfMonth(selectedDate);
      const endDate = endOfMonth(selectedDate);

      const monthLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= startDate && 
               logDate <= endDate && 
               log.email?.toLowerCase() === employee.email?.toLowerCase();
      });

      // Add attendance table
      doc.text('Attendance Records:', 20, 100);
      const attendanceData = monthLogs.map(log => [
        format(new Date(log.date), 'MMM dd, yyyy'),
        format(new Date(log.checkIn), 'hh:mm a'),
        format(new Date(log.checkOut), 'hh:mm a'),
        `${log.effectiveHours} hours`,
        log.effectiveHours >= 8 ? 'Full Day' : log.effectiveHours > 0 ? 'Partial Day' : 'Absent'
      ]);

      autoTable(doc, {
        startY: 105,
        head: [['Date', 'Check In', 'Check Out', 'Hours Worked', 'Status']],
        body: attendanceData,
      });

      // Add tasks table
      doc.addPage();
      doc.text('Tasks Overview:', 20, 20);
      const tasksData = tasks.map(task => [
        task.title,
        task.description || 'N/A',
        task.status,
        format(new Date(task.due_date || ''), 'MMM dd, yyyy')
      ]);

      autoTable(doc, {
        startY: 25,
        head: [['Task Title', 'Description', 'Status', 'Due Date']],
        body: tasksData,
      });

      // Save the PDF
      const fileName = `${employee.name}_performance_report_${selectedMonth}.pdf`;
      doc.save(fileName);
      toast.success("Report downloaded successfully");
    }).catch(error => {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate report");
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!employee) {
    return <div>Employee not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Employee Performance</h2>
        <div className="flex items-center gap-4">
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {getMonthOptions().map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={generatePDF}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {employee?.profile_photo && (
              <img
                src={employee.profile_photo}
                alt={employee.name || ''}
                className="h-16 w-16 rounded-full object-cover"
              />
            )}
            <div>
              <CardTitle>{employee?.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{employee?.designation}</p>
              <p className="text-sm text-muted-foreground">Employee ID: {employee?.employee_id}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Present Days"
          value={analytics.presentDays}
          icon={CheckCircle2}
        />
        <StatCard
          title="Absent Days"
          value={analytics.absentDays}
          icon={XCircle}
        />
        <StatCard
          title="Completed Tasks"
          value={analytics.completedTasks}
          icon={CalendarDays}
        />
        <StatCard
          title="Pending Tasks"
          value={analytics.pendingTasks}
          icon={Clock}
        />
      </div>

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
          <TabsTrigger value="tasks">Task Status</TabsTrigger>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records - {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceTable 
                showTodayOnly={false} 
                userEmail={employee?.email || ''} 
                selectedMonth={selectedMonth}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Overview - {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(task.due_date || '').toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        className={
                          task.status === 'completed'
                            ? 'bg-green-500'
                            : task.status === 'in-progress'
                            ? 'bg-yellow-500'
                            : 'bg-gray-500'
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-center text-muted-foreground">No tasks assigned for this month</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leave Requests History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {leaveRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{request.type}</h4>
                        <p className="text-sm text-muted-foreground">
                          From: {new Date(request.start_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          To: {new Date(request.end_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Reason: {request.reason}
                        </p>
                      </div>
                      <Badge
                        className={
                          request.status === 'approved'
                            ? 'bg-green-500'
                            : request.status === 'rejected'
                            ? 'bg-red-500'
                            : 'bg-yellow-500'
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                  {leaveRequests.length === 0 && (
                    <p className="text-center text-muted-foreground">No leave requests found</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Personal Information</CardTitle>
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)}>Edit</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={profileData.date_of_birth}
                    onChange={(e) => setProfileData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fathers_name">Father's Name</Label>
                  <Input
                    id="fathers_name"
                    value={profileData.fathers_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, fathers_name: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mothers_name">Mother's Name</Label>
                  <Input
                    id="mothers_name"
                    value={profileData.mothers_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, mothers_name: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_number">Contact Number</Label>
                  <Input
                    id="contact_number"
                    value={profileData.contact_number}
                    onChange={(e) => setProfileData(prev => ({ ...prev, contact_number: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Emergency Contact</Label>
                  <Input
                    id="emergency_contact"
                    value={profileData.emergency_contact}
                    onChange={(e) => setProfileData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              {isEditing && (
                <div className="flex justify-end gap-4 mt-6">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button onClick={handleProfileUpdate}>Save Changes</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeePerformance;
