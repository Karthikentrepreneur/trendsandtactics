import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { format, parseISO, startOfMonth, endOfMonth, isAfter, isSunday, getDaysInMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CalendarDays, CheckCircle2, Clock, Download, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User, Task } from "@/types/user";
import type { ProfessionalExperience, EmployeeDocument, BankInformation, DocumentUpload } from "@/types/employee";
import AttendanceTable from "./AttendanceTable";
import { StatCard } from "@/components/employee/dashboard/StatCard";
import { attendanceService } from "@/services/attendanceService";
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
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const [bankData, setBankData] = useState({
    bank_name: "",
    branch_name: "",
    bank_address: "",
    account_number: "",
    account_type: "",
    ifsc_code: ""
  });
  const [documentUpload, setDocumentUpload] = useState<DocumentUpload>({
    name: "",
    type: "",
    file: null
  });
  const [professionalExperience, setProfessionalExperience] = useState<ProfessionalExperience[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [bankInfo, setBankInfo] = useState<BankInformation | null>(null);

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
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', employeeId)
          .single();

        if (profileData) {
          setEmployee(profileData);

          const [year, month] = selectedMonth.split('-');
          const selectedDate = new Date(parseInt(year), parseInt(month) - 1);
          const startDate = startOfMonth(selectedDate);
          const endDate = endOfMonth(selectedDate);
          const today = new Date();

          const logs = await attendanceService.getAttendanceLogs();
          const monthLogs = logs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= startDate && logDate <= endDate && 
                   log.email?.toLowerCase() === profileData.email?.toLowerCase();
          });

          const presentDays = monthLogs.filter(log => log.effectiveHours > 0).length;
          
          const daysInMonth = getDaysInMonth(selectedDate);
          const lastDayToConsider = isAfter(endDate, today) ? today.getDate() : daysInMonth;
          
          const sundaysCount = calculateSundaysInMonth(parseInt(year), parseInt(month), lastDayToConsider);
          const casualLeaveAllowance = 1;

          const absentDays = Math.max(0, lastDayToConsider - presentDays - sundaysCount - casualLeaveAllowance);

          const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', employeeId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });

          if (tasksData) {
            setTasks(tasksData);
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

  useEffect(() => {
    const fetchProfessionalExperience = async () => {
      if (!employeeId) return;
      const { data, error } = await supabase
        .from('professional_experience')
        .select('*')
        .eq('employee_id', employeeId)
        .order('start_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching professional experience:', error);
        return;
      }
      setProfessionalExperience(data || []);
    };

    fetchProfessionalExperience();
  }, [employeeId]);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!employeeId) return;
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('uploaded_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }
      setDocuments(data || []);
    };

    fetchDocuments();
  }, [employeeId]);

  useEffect(() => {
    const fetchBankInfo = async () => {
      if (!employeeId) return;
      const { data, error } = await supabase
        .from('bank_information')
        .select('*')
        .eq('employee_id', employeeId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching bank information:', error);
        return;
      }
      setBankInfo(data || null);
    };

    fetchBankInfo();
  }, [employeeId]);

  useEffect(() => {
    if (employee) {
      setProfileData({
        date_of_birth: employee.date_of_birth || "",
        fathers_name: employee.fathers_name || "",
        mothers_name: employee.mothers_name || "",
        address: employee.address || "",
        contact_number: employee.contact_number || "",
        emergency_contact: employee.emergency_contact || ""
      });
    }
  }, [employee]);

  useEffect(() => {
    if (bankInfo) {
      setBankData({
        bank_name: bankInfo.bank_name,
        branch_name: bankInfo.branch_name,
        bank_address: bankInfo.bank_address || "",
        account_number: bankInfo.account_number,
        account_type: bankInfo.account_type,
        ifsc_code: bankInfo.ifsc_code
      });
    }
  }, [bankInfo]);

  const handleProfileUpdate = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          date_of_birth: profileData.date_of_birth,
          fathers_name: profileData.fathers_name,
          mothers_name: profileData.mothers_name,
          address: profileData.address,
          contact_number: profileData.contact_number,
          emergency_contact: profileData.emergency_contact
        })
        .eq('id', employeeId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['employee'] });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile");
    }
  };

  const handleBankUpdate = async () => {
    try {
      const { error } = await supabase
        .from('bank_information')
        .upsert({
          employee_id: employeeId,
          ...bankData
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['bank_info'] });
      setIsEditingBank(false);
      toast.success("Bank information updated successfully");
    } catch (error) {
      console.error('Error updating bank information:', error);
      toast.error("Failed to update bank information");
    }
  };

  const handleDocumentUpload = async () => {
    if (!documentUpload.file || !employeeId) {
      toast.error("Please select a file and provide all required information");
      return;
    }

    try {
      setUploading(true);
      const fileExt = documentUpload.file.name.split('.').pop();
      const filePath = `${employeeId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, documentUpload.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: employeeId,
          document_name: documentUpload.name,
          document_type: documentUpload.type,
          file_path: publicUrl,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowUploadDialog(false);
      setDocumentUpload({ name: "", type: "", file: null });
      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const generatePDF = () => {
    if (!employee) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(16);
    doc.text(`Performance Report - ${employee.name}`, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Month: ${format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}`, pageWidth / 2, 25, { align: 'center' });

    doc.text(`Employee ID: ${employee.employee_id}`, 20, 35);
    doc.text(`Designation: ${employee.designation}`, 20, 42);

    doc.text('Performance Summary:', 20, 55);
    doc.text(`Present Days: ${analytics.presentDays}`, 30, 62);
    doc.text(`Absent Days: ${analytics.absentDays}`, 30, 69);
    doc.text(`Completed Tasks: ${analytics.completedTasks}`, 30, 76);
    doc.text(`Pending Tasks: ${analytics.pendingTasks}`, 30, 83);

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

          <Card>
            <CardHeader>
              <CardTitle>Professional Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {professionalExperience.map((experience) => (
                    <div key={experience.id} className="p-4 border rounded-lg">
                      <h4 className="font-medium">{experience.company_name}</h4>
                      <p className="text-sm text-muted-foreground">{experience.position}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(experience.start_date), 'MMM yyyy')} - 
                        {experience.end_date 
                          ? format(new Date(experience.end_date), 'MMM yyyy')
                          : 'Present'}
                      </p>
                      {experience.responsibilities && (
                        <p className="mt-2 text-sm">{experience.responsibilities}</p>
                      )}
                    </div>
                  ))}
                  {professionalExperience.length === 0 && (
                    <p className="text-center text-muted-foreground">No professional experience records found</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{doc.document_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Type: {doc.document_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Uploaded: {format(new Date(doc.uploaded_at || ''), 'PP')}
                          </p>
                        </div>
                        <Button variant="outline" onClick={() => window.open(doc.file_path, '_blank')}>
                          View
                        </Button>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <p className="text-center text-muted-foreground">No documents found</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Bank Information</CardTitle>
                {!isEditingBank && (
                  <Button onClick={() => setIsEditingBank(true)}>Edit</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={bankData.bank_name}
                    onChange={(e) => setBankData(prev => ({ ...prev, bank_name: e.target.value }))}
                    disabled={!isEditingBank}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch_name">Branch Name</Label>
                  <Input
                    id="branch_name"
                    value={bankData.branch_name}
                    onChange={(e) => setBankData(prev => ({ ...prev, branch_name: e.target.value }))}
                    disabled={!isEditingBank}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_address">Bank Address</Label>
                  <Input
                    id="bank_address"
                    value={bankData.bank_address}
                    onChange={(e) => setBankData(prev => ({ ...prev, bank_address: e.target.value }))}
                    disabled={!isEditingBank}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_number">Account Number</Label>
                  <Input
                    id="account_number"
                    value={bankData.account_number}
                    onChange={(e) => setBankData(prev => ({ ...prev, account_number: e.target.value }))}
                    disabled={!isEditingBank}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_type">Account Type</Label>
                  <Input
                    id="account_type"
                    value={bankData.account_type}
                    onChange={(e) => setBankData(prev => ({ ...prev, account_type: e.target.value }))}
                    disabled={!isEditingBank}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifsc_code">IFSC Code</Label>
                  <Input
                    id="ifsc_code"
                    value={bankData.ifsc_code}
                    onChange={(e) => setBankData(prev => ({ ...prev, ifsc_code: e.target.value }))}
                    disabled={!isEditingBank}
                  />
                </div>
              </div>
              {isEditingBank && (
                <div className="flex justify-end gap-4 mt-6">
                  <Button variant="outline" onClick={() => setIsEditingBank(false)}>Cancel</Button>
                  <Button onClick={handleBankUpdate}>Save Changes</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document_name">Document Name</Label>
              <Input
                id="document_name"
                value={documentUpload.name}
                onChange={(e) => setDocumentUpload(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_type">Document Type</Label>
              <Select 
                value={documentUpload.type}
                onValueChange={(value) => setDocumentUpload(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id_proof">ID Proof</SelectItem>
                  <SelectItem value="address_proof">Address Proof</SelectItem>
                  <SelectItem value="educational">Educational Certificate</SelectItem>
                  <SelectItem value="experience">Experience Certificate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_file">File</Label>
              <Input
                id="document_file"
                type="file"
                onChange={(e) => setDocumentUpload(prev => ({ 
                  ...prev, 
                  file: e.target.files ? e.target.files[0] : null 
                }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDocumentUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeePerformance;
