
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import type { User, PayslipFormValues, SalaryInformation } from "@/types/user";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  BriefcaseIcon, 
  CalendarIcon, 
  Download, 
  FileText, 
  FileUp, 
  Plus, 
  Printer, 
  Upload, 
  UserIcon, 
  Building, 
  CreditCard,
  CheckCircle2,
  XCircle,
  CalendarDays
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { attendanceService } from "@/services/attendanceService";

interface Payslip {
  id: string;
  user_id: string;
  month: number;
  year: number;
  basic_salary: number;
  hra: number;
  da: number;
  ta: number;
  other_allowances: number;
  epf_deduction: number;
  other_deductions: number;
  gross_salary: number;
  net_salary: number;
  created_at: string;
}

interface ProfessionalExperience {
  id: string;
  user_id: string;
  company_name: string;
  position: string;
  start_date: string;
  end_date: string | null;
  responsibilities: string | null;
  created_at: string;
}

interface EmployeeDocument {
  id: string;
  user_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  uploaded_at: string;
}

// Define a schema that matches the PayslipFormValues interface
const payslipFormSchema = z.object({
  month: z.string().min(1, "Month is required"),
  year: z.string().min(1, "Year is required"),
  basic_salary: z.coerce.number().default(0),
  hra: z.coerce.number().default(0),
  da: z.coerce.number().default(0),
  ta: z.coerce.number().default(0),
  other_allowances: z.coerce.number().default(0),
  epf_deduction: z.coerce.number().default(0),
  other_deductions: z.coerce.number().default(0),
});

type PayslipSchemaType = z.infer<typeof payslipFormSchema>;

const EmployeePerformance = () => {
  const { employeeId } = useParams();
  const [employee, setEmployee] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [professionalExperience, setProfessionalExperience] = useState<ProfessionalExperience[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [salaryInfo, setSalaryInfo] = useState<SalaryInformation | null>(null);
  const [currentDate] = useState(new Date());
  const [netSalary, setNetSalary] = useState<number>(0);
  const [newExperience, setNewExperience] = useState({
    company_name: "",
    position: "",
    start_date: "",
    end_date: "",
    responsibilities: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [attendanceData, setAttendanceData] = useState({
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  
  const years = Array.from({ length: 11 }, (_, i) => (currentDate.getFullYear() - 5 + i).toString());
  const departments = ["HR", "IT", "Finance", "Operations", "Marketing", "Sales", "Administration"];
  const documentTypes = ["ID Proof", "Address Proof", "Education Certificate", "Experience Certificate", "Salary Slip", "Others"];

  // Use the schema with the form
  const form = useForm<PayslipFormValues>({
    resolver: zodResolver(payslipFormSchema) as any, // Type assertion to bypass type checking temporarily
    defaultValues: {
      month: months[currentDate.getMonth()],
      year: currentDate.getFullYear().toString(),
      basic_salary: 0,
      hra: 0,
      da: 0,
      ta: 0,
      other_allowances: 0,
      epf_deduction: 0,
      other_deductions: 0,
    },
  });

  const watchAllFields = form.watch();
  
  useEffect(() => {
    const { basic_salary, hra, da, ta, other_allowances, epf_deduction, other_deductions } = watchAllFields;
    
    const totalEarnings = 
      Number(basic_salary || 0) + 
      Number(hra || 0) + 
      Number(da || 0) + 
      Number(ta || 0) + 
      Number(other_allowances || 0);
    
    const totalDeductions = 
      Number(epf_deduction || 0) + 
      Number(other_deductions || 0);
    
    setNetSalary(totalEarnings - totalDeductions);
  }, [watchAllFields]);

  useEffect(() => {
    fetchEmployeeData();
  }, [employeeId]);

  // Fix type issues by adding type assertion
  const fetchEmployeeData = async () => {
    try {
      if (!employeeId) return;
      
      const { data: employeeData, error: employeeError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", employeeId)
        .single();

      if (employeeError) throw employeeError;

      if (employeeData) {
        setEmployee(employeeData as User);
        await Promise.all([
          fetchPayslips(),
          fetchProfessionalExperience(),
          fetchDocuments(),
          fetchSalaryInformation(),
          fetchAttendanceStats()
        ]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching employee:", error);
      toast({
        title: "Error",
        description: "Failed to fetch employee data",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const fetchPayslips = async () => {
    if (!employeeId) return;
    
    const { data, error } = await supabase
      .from("payslips")
      .select("*")
      .eq("user_id", employeeId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching payslips:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payslip data",
        variant: "destructive",
      });
      return;
    }
    
    setPayslips(data || []);
  };

  const fetchProfessionalExperience = async () => {
    if (!employeeId) return;
    
    const { data, error } = await supabase
      .from("professional_experience")
      .select("*")
      .eq("user_id", employeeId)
      .order("start_date", { ascending: false });
    
    if (error) {
      console.error("Error fetching professional experience:", error);
      return;
    }
    
    setProfessionalExperience(data || []);
  };

  const fetchDocuments = async () => {
    if (!employeeId) return;
    
    const { data, error } = await supabase
      .from("employee_documents")
      .select("*")
      .eq("user_id", employeeId)
      .order("uploaded_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching documents:", error);
      return;
    }
    
    setDocuments(data || []);
  };

  const fetchSalaryInformation = async () => {
    if (!employeeId) return;
    
    const { data, error } = await supabase
      .from("salary_information")
      .select("*")
      .eq("employee_id", employeeId)
      .single();
    
    if (error && error.code !== "PGRST116") { // PGRST116 is "no rows returned" error
      console.error("Error fetching salary information:", error);
      return;
    }
    
    setSalaryInfo(data || null);
  };

  const fetchAttendanceStats = async () => {
    try {
      if (!employeeId || !employee?.email) return;
      
      const logs = await attendanceService.getAttendanceLogs();
      const employeeLogs = logs.filter(log => 
        log.email?.toLowerCase() === employee.email?.toLowerCase()
      );
      
      // Calculate present days (any day with attendance)
      const presentDays = employeeLogs.filter(log => log.effectiveHours > 0).length;
      
      // Get leaves from the database
      const { data: leaves } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("user_id", employeeId)
        .eq("status", "approved");
      
      const leaveDays = leaves?.length || 0;
      
      // Calculate work days in current month (excluding weekends)
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      let workDays = 0;
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const day = date.getDay();
        if (day !== 0 && day !== 6) { // Not Sunday or Saturday
          workDays++;
        }
      }
      
      const absentDays = Math.max(0, workDays - presentDays - leaveDays);
      
      setAttendanceData({
        presentDays,
        absentDays,
        leaveDays
      });
    } catch (error) {
      console.error("Error calculating attendance stats:", error);
    }
  };

  const handleCreatePayslip = async (values: PayslipFormValues) => {
    try {
      if (!employeeId || !employee) return;

      const month = typeof values.month === 'string' ? parseInt(values.month) : values.month;
      const year = typeof values.year === 'string' ? parseInt(values.year) : values.year;

      const { data: existingPayslip } = await supabase
        .from("payslips")
        .select("*")
        .eq("user_id", employeeId)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      const totalEarnings = 
        values.basic_salary + 
        values.hra + 
        values.da + 
        values.ta + 
        values.other_allowances;
      
      const totalDeductions = 
        values.epf_deduction + 
        values.other_deductions;
      
      const netSalary = totalEarnings - totalDeductions;

      let result;
      
      if (existingPayslip) {
        result = await supabase
          .from("payslips")
          .update({
            basic_salary: values.basic_salary,
            hra: values.hra,
            da: values.da,
            ta: values.ta,
            other_allowances: values.other_allowances,
            epf_deduction: values.epf_deduction,
            other_deductions: values.other_deductions,
            net_salary: netSalary,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingPayslip.id);
          
        toast({
          title: "Success",
          description: "Payslip updated successfully",
        });
      } else {
        result = await supabase
          .from("payslips")
          .insert({
            user_id: employeeId,
            month: month,
            year: year,
            basic_salary: values.basic_salary,
            hra: values.hra,
            da: values.da,
            ta: values.ta,
            other_allowances: values.other_allowances,
            epf_deduction: values.epf_deduction,
            other_deductions: values.other_deductions,
            gross_salary: totalEarnings,
            net_salary: netSalary
          });
          
        toast({
          title: "Success",
          description: "Payslip created successfully",
        });
      }
      
      if (result.error) throw result.error;
      
      await fetchPayslips();
      
    } catch (error) {
      console.error("Error creating/updating payslip:", error);
      toast({
        title: "Error",
        description: "Failed to create/update payslip",
        variant: "destructive",
      });
    }
  };

  const handleAddExperience = async () => {
    try {
      if (!employeeId) return;
      
      const { error } = await supabase
        .from("professional_experience")
        .insert({
          user_id: employeeId,
          company_name: newExperience.company_name,
          position: newExperience.position,
          start_date: newExperience.start_date,
          end_date: newExperience.end_date || null,
          responsibilities: newExperience.responsibilities || null
        });
      
      if (error) throw error;
      
      setNewExperience({
        company_name: "",
        position: "",
        start_date: "",
        end_date: "",
        responsibilities: ""
      });
      
      toast({
        title: "Success",
        description: "Experience added successfully",
      });
      
      await fetchProfessionalExperience();
    } catch (error) {
      console.error("Error adding experience:", error);
      toast({
        title: "Error",
        description: "Failed to add experience",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      // Set document name from file name if not provided
      if (!documentName) {
        setDocumentName(e.target.files[0].name.split('.')[0]);
      }
    }
  };

  const handleUploadDocument = async () => {
    try {
      if (!employeeId || !selectedFile || !documentType || !documentName) {
        toast({
          title: "Error",
          description: "All fields are required",
          variant: "destructive",
        });
        return;
      }
      
      setUploadingDocument(true);
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `documents/${employeeId}/${Date.now()}-${documentName}.${fileExt}`;
      
      // Upload file to storage
      const { error: uploadError, data } = await supabase.storage
        .from("employees")
        .upload(filePath, selectedFile);
      
      if (uploadError) throw uploadError;
      
      // Get file URL
      const { data: { publicUrl } } = supabase.storage
        .from("employees")
        .getPublicUrl(filePath);
      
      // Save document info in database
      const { error: dbError } = await supabase
        .from("employee_documents")
        .insert({
          user_id: employeeId,
          document_type: documentType,
          document_name: documentName,
          file_path: publicUrl
        });
      
      if (dbError) throw dbError;
      
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      
      setSelectedFile(null);
      setDocumentType("");
      setDocumentName("");
      await fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleUpdateSalaryInfo = async (data: SalaryInformation) => {
    try {
      if (!employeeId) return;
      
      // Calculate net pay based on gross salary and deductions
      const epfAmount = (data.gross_salary * data.epf_percentage) / 100;
      const totalDeduction = data.total_deduction || epfAmount;
      const netPay = data.gross_salary - totalDeduction;
      
      let result;
      
      if (salaryInfo) {
        result = await supabase
          .from("salary_information")
          .update({
            gross_salary: data.gross_salary,
            epf_percentage: data.epf_percentage,
            total_deduction: totalDeduction,
            net_pay: netPay,
            updated_at: new Date().toISOString()
          })
          .eq("id", salaryInfo.id);
      } else {
        result = await supabase
          .from("salary_information")
          .insert({
            user_id: employeeId,
            employee_id: employee?.employee_id || '',
            gross_salary: data.gross_salary,
            epf_percentage: data.epf_percentage,
            total_deduction: totalDeduction,
            net_pay: netPay
          });
      }
      
      if (result.error) throw result.error;
      
      await fetchSalaryInformation();
      
      toast({
        title: "Success",
        description: "Salary information updated successfully",
      });
    } catch (error) {
      console.error("Error updating salary information:", error);
      toast({
        title: "Error",
        description: "Failed to update salary information",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async (updatedData: any) => {
    try {
      if (!employeeId || !employee) return;
      
      const { error } = await supabase
        .from("profiles")
        .update(updatedData)
        .eq("id", employeeId);
      
      if (error) throw error;
      
      // Update local state to reflect changes
      setEmployee({ ...employee, ...updatedData });
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const generatePayslipPDF = (payslip: Payslip) => {
    if (!employee) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add company logo
    try {
      // Comment this out if you don't have a logo
      const logo = new Image();
      logo.src = '/logo.png'; // Assuming logo is in public folder
      doc.addImage(logo, 'PNG', 14, 10, 40, 20);
    } catch (e) {
      console.error("Error adding logo", e);
    }
    
    // Add company name as header
    doc.setFillColor(52, 101, 164);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Trends & Tactics", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(14);
    doc.text("Payslip for " + payslip.month + " " + payslip.year, pageWidth / 2, 25, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Employee Details", 14, 40);
    
    // Employee information
    const employeeInfo = [
      ["Employee Name:", employee.name || ""],
      ["Employee ID:", employee.employee_id || ""],
      ["Designation:", employee.designation || "N/A"],
      ["Date of Joining:", employee.date_of_joining ? format(new Date(employee.date_of_joining), "dd/MM/yyyy") : "N/A"],
    ];
    
    autoTable(doc, {
      startY: 45,
      head: [],
      body: employeeInfo,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 40 } }
    });
    
    // Attendance information
    doc.text("Attendance Summary", 14, 85);
    
    const attendanceInfo = [
      ["Present Days:", `${attendanceData.presentDays}`],
      ["Absent Days:", `${attendanceData.absentDays}`],
      ["Leave Days:", `${attendanceData.leaveDays}`],
    ];
    
    autoTable(doc, {
      startY: 90,
      head: [],
      body: attendanceInfo,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 40 } }
    });
    
    doc.text("Salary Details", 14, 120);
    
    const earningsTable = [
      ["Earnings", "Amount"],
      ["Basic Salary", `${payslip.basic_salary.toFixed(2)}`],
      ["HRA", `${payslip.hra.toFixed(2)}`],
      ["DA", `${payslip.da.toFixed(2)}`],
      ["TA", `${payslip.ta.toFixed(2)}`],
      ["Other Allowances", `${payslip.other_allowances.toFixed(2)}`],
      ["Total Earnings", `${(payslip.basic_salary + payslip.hra + payslip.da + payslip.ta + payslip.other_allowances).toFixed(2)}`]
    ];
    
    const deductionsTable = [
      ["Deductions", "Amount"],
      ["EPF", `${payslip.epf_deduction.toFixed(2)}`],
      ["Other Deductions", `${payslip.other_deductions.toFixed(2)}`],
      ["Total Deductions", `${(payslip.epf_deduction + payslip.other_deductions).toFixed(2)}`]
    ];
    
    autoTable(doc, {
      startY: 125,
      head: [["Earnings", "Amount"]],
      body: earningsTable.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [70, 130, 180] },
      styles: { fontSize: 10 },
      margin: { left: 14 },
      tableWidth: 80
    });
    
    autoTable(doc, {
      startY: 125,
      head: [["Deductions", "Amount"]],
      body: deductionsTable.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [70, 130, 180] },
      styles: { fontSize: 10 },
      margin: { left: pageWidth - 94 },
      tableWidth: 80
    });
    
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 200, pageWidth - 28, 10, 'F');
    doc.setFontSize(11);
    doc.text("Net Salary:", 16, 207);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`₹ ${payslip.net_salary.toFixed(2)}`, pageWidth - 16, 207, { align: "right" });
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("This is a computer-generated payslip and doesn't require a signature.", pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.text("Generated on: " + format(new Date(), "dd/MM/yyyy"), pageWidth / 2, pageHeight - 5, { align: "center" });
    
    doc.save(`Payslip_${employee.name?.replace(/\s+/g, '_')}_${payslip.month}_${payslip.year}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center p-4">
        <h2 className="text-2xl font-bold">Employee not found</h2>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{employee.name}</h1>
          <p className="text-gray-600">{employee.designation}</p>
          {employee.date_of_joining && 
            <p className="text-gray-600">
              Joined on: {format(new Date(employee.date_of_joining), "MMMM dd, yyyy")}
            </p>
          }
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/reports")}>
          Back to Reports
        </Button>
      </div>

      <Tabs defaultValue="payslip" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
          <TabsTrigger value="payslip">
            <FileText className="mr-1 h-4 w-4" />
            Payslip
          </TabsTrigger>
          <TabsTrigger value="payslipHistory">
            <CalendarIcon className="mr-1 h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="professionalData">
            <BriefcaseIcon className="mr-1 h-4 w-4" />
            Experience
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileUp className="mr-1 h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="salaryInfo">
            <CreditCard className="mr-1 h-4 w-4" />
            Salary
          </TabsTrigger>
          <TabsTrigger value="profileInfo">
            <UserIcon className="mr-1 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="attendanceReport">
            <Building className="mr-1 h-4 w-4" />
            Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payslip">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Generate Payslip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreatePayslip)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="month"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Month</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {months.map((month) => (
                                  <SelectItem key={month} value={month}>
                                    {month}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Year</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {years.map((year) => (
                                  <SelectItem key={year} value={year}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Earnings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="basic_salary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Basic Salary (Gross: {salaryInfo?.gross_salary || 0})</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value.toString()}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="hra"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>HRA</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value.toString()}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="da"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>DA</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value.toString()}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="ta"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>TA</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value.toString()}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="other_allowances"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Other Allowances</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value.toString()}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Deductions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="epf_deduction"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>EPF Deduction</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value.toString()}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="other_deductions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Other Deductions</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value.toString()}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium">Net Salary:</span>
                        <span className="text-lg font-bold">₹ {netSalary.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit">
                      Generate Payslip
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslipHistory">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5" />
                Payslip History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payslips.length === 0 ? (
                <div className="text-center p-8">
                  <p className="text-gray-500">No payslips generated yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {payslips.map((payslip) => (
                    <Card key={payslip.id} className="overflow-hidden">
                      <CardHeader className="bg-gray-50 py-3">
                        <CardTitle className="text-lg flex justify-between items-center">
                          <span>{payslip.month} {payslip.year}</span>
                          <span className="text-base font-normal">₹ {payslip.net_salary.toFixed(2)}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Basic</p>
                            <p className="font-medium">₹ {payslip.basic_salary.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">HRA</p>
                            <p className="font-medium">₹ {payslip.hra.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">DA</p>
                            <p className="font-medium">₹ {payslip.da.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">EPF</p>
                            <p className="font-medium">₹ {payslip.epf_deduction.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => generatePayslipPDF(payslip)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => generatePayslipPDF(payslip)}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professionalData">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <BriefcaseIcon className="mr-2 h-5 w-5" />
                Professional Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {professionalExperience.length === 0 ? (
                    <div className="text-center p-8">
                      <p className="text-gray-500">No professional experience data available.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {professionalExperience.map((exp) => (
                        <Card key={exp.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-bold">{exp.company_name}</h3>
                                <p className="text-gray-600">{exp.position}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-500">
                                  {format(new Date(exp.start_date), "MMM yyyy")} - 
                                  {exp.end_date 
                                    ? format(new Date(exp.end_date), " MMM yyyy") 
                                    : " Present"}
                                </p>
                              </div>
                            </div>
                            {exp.responsibilities && (
                              <div className="mt-2">
                                <p className="text-sm">{exp.responsibilities}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Add Experience</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="company_name">Company Name</Label>
                          <Input 
                            id="company_name" 
                            value={newExperience.company_name}
                            onChange={(e) => setNewExperience({...newExperience, company_name: e.target.value})}
                            placeholder="Company name" 
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="position">Position</Label>
                          <Input 
                            id="position" 
                            value={newExperience.position}
                            onChange={(e) => setNewExperience({...newExperience, position: e.target.value})}
                            placeholder="Job title" 
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="start_date">Start Date</Label>
                          <Input 
                            id="start_date" 
                            type="date" 
                            value={newExperience.start_date}
                            onChange={(e) => setNewExperience({...newExperience, start_date: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="end_date">End Date (leave empty if current)</Label>
                          <Input 
                            id="end_date" 
                            type="date" 
                            value={newExperience.end_date}
                            onChange={(e) => setNewExperience({...newExperience, end_date: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="responsibilities">Responsibilities</Label>
                          <Textarea 
                            id="responsibilities" 
                            value={newExperience.responsibilities}
                            onChange={(e) => setNewExperience({...newExperience, responsibilities: e.target.value})}
                            placeholder="Job responsibilities and achievements" 
                            rows={3}
                          />
                        </div>
                        
                        <Button 
                          className="w-full"
                          onClick={handleAddExperience}
                          disabled={!newExperience.company_name || !newExperience.position || !newExperience.start_date}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Experience
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Employee Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {documents.length === 0 ? (
                    <div className="text-center p-8">
                      <p className="text-gray-500">No documents uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {documents.map((doc) => (
                        <Card key={doc.id}>
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <h3 className="font-bold">{doc.document_name}</h3>
                              <p className="text-gray-600 text-sm">{doc.document_type}</p>
                              <p className="text-gray-500 text-xs">
                                {format(new Date(doc.uploaded_at), "MMM dd, yyyy")}
                              </p>
                            </div>
                            <div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(doc.file_path, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Upload Document</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="document_type">Document Type</Label>
                          <Select 
                            value={documentType}
                            onValueChange={setDocumentType}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                            <SelectContent>
                              {documentTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="document_name">Document Name</Label>
                          <Input 
                            id="document_name" 
                            value={documentName}
                            onChange={(e) => setDocumentName(e.target.value)}
                            placeholder="Document name" 
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="document_file">File</Label>
                          <Input 
                            id="document_file" 
                            type="file" 
                            onChange={handleFileChange}
                          />
                        </div>
                        
                        <Button 
                          className="w-full"
                          onClick={handleUploadDocument}
                          disabled={uploadingDocument || !selectedFile || !documentType || !documentName}
                        >
                          {uploadingDocument ? (
                            <div className="flex items-center">
                              <div className="h-4 w-4 animate-spin mr-2 border-2 border-gray-300 border-t-white rounded-full"></div>
                              Uploading...
                            </div>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-1" />
                              Upload Document
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salaryInfo">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Salary Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Salary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {salaryInfo ? (
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gross Salary:</span>
                          <span className="font-semibold">₹ {salaryInfo.gross_salary.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">EPF Percentage:</span>
                          <span className="font-semibold">{salaryInfo.epf_percentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Deduction:</span>
                          <span className="font-semibold">₹ {salaryInfo.total_deduction.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Net Pay:</span>
                          <span className="font-semibold">₹ {salaryInfo.net_pay.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Last Updated:</span>
                          <span>{salaryInfo.updated_at ? format(new Date(salaryInfo.updated_at), "dd/MM/yyyy") : 'Never'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <p className="text-gray-500">No salary information available.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Update Salary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="gross_salary">Gross Salary</Label>
                        <Input 
                          id="gross_salary" 
                          type="number" 
                          placeholder="0.00"
                          defaultValue={salaryInfo?.gross_salary || 0}
                          onChange={(e) => {
                            const newSalaryInfo = {...(salaryInfo || {
                              id: '',
                              employee_id: employeeId || '',
                              gross_salary: 0,
                              epf_percentage: 0,
                              total_deduction: 0,
                              net_pay: 0,
                              created_at: new Date().toISOString(),
                              updated_at: null
                            })};
                            newSalaryInfo.gross_salary = parseFloat(e.target.value) || 0;
                            setSalaryInfo(newSalaryInfo as SalaryInformation);
                          }}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="epf_percentage">EPF Percentage</Label>
                        <Input 
                          id="epf_percentage" 
                          type="number" 
                          placeholder="0"
                          defaultValue={salaryInfo?.epf_percentage || 0}
                          onChange={(e) => {
                            const newSalaryInfo = {...(salaryInfo || {
                              id: '',
                              employee_id: employeeId || '',
                              gross_salary: 0,
                              epf_percentage: 0,
                              total_deduction: 0,
                              net_pay: 0,
                              created_at: new Date().toISOString(),
                              updated_at: null
                            })};
                            newSalaryInfo.epf_percentage = parseFloat(e.target.value) || 0;
                            setSalaryInfo(newSalaryInfo as SalaryInformation);
                          }}
                        />
                      </div>
                      
                      <Button 
                        className="w-full"
                        onClick={() => salaryInfo && handleUpdateSalaryInfo(salaryInfo)}
                      >
                        Update Salary Information
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profileInfo">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <UserIcon className="mr-2 h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Personal Details</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="profile_name">Full Name</Label>
                      <Input 
                        id="profile_name" 
                        value={employee.name || ''}
                        onChange={(e) => handleUpdateProfile({ name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="profile_email">Email Address</Label>
                      <Input 
                        id="profile_email" 
                        value={employee.email || ''}
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="profile_dob">Date of Birth</Label>
                      <Input 
                        id="profile_dob" 
                        type="date"
                        value={employee.date_of_birth || ''}
                        onChange={(e) => handleUpdateProfile({ date_of_birth: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="profile_address">Address</Label>
                      <Textarea 
                        id="profile_address" 
                        value={employee.address || ''}
                        onChange={(e) => handleUpdateProfile({ address: e.target.value })}
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="profile_contact">Contact Number</Label>
                      <Input 
                        id="profile_contact" 
                        value={employee.contact_number || ''}
                        onChange={(e) => handleUpdateProfile({ contact_number: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="profile_fathers_name">Father's Name</Label>
                      <Input 
                        id="profile_fathers_name" 
                        value={employee.fathers_name || ''}
                        onChange={(e) => handleUpdateProfile({ fathers_name: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Employment Details</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="profile_employeeId">Employee ID</Label>
                      <Input 
                        id="profile_employeeId" 
                        value={employee.employee_id || ''}
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="profile_designation">Designation</Label>
                      <Input 
                        id="profile_designation" 
                        value={employee.designation || ''}
                        onChange={(e) => handleUpdateProfile({ designation: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="profile_date_of_joining">Date of Joining</Label>
                      <Input 
                        id="profile_date_of_joining"
                        type="date"
                        value={employee.date_of_joining || ''}
                        onChange={(e) => handleUpdateProfile({ date_of_joining: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="profile_fathersName">Father's Name</Label>
                      <Input 
                        id="profile_fathersName" 
                        value={employee.fathers_name || ''}
                        onChange={(e) => handleUpdateProfile({ fathers_name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="profile_mothersName">Mother's Name</Label>
                      <Input 
                        id="profile_mothersName" 
                        value={employee.mothers_name || ''}
                        onChange={(e) => handleUpdateProfile({ mothers_name: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendanceReport">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Building className="mr-2 h-5 w-5" />
                Attendance Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="bg-green-50">
                  <CardContent className="p-4 flex items-center">
                    <CheckCircle2 className="h-10 w-10 mr-4 text-green-500" />
                    <div>
                      <p className="text-gray-600 text-sm">Present Days</p>
                      <p className="text-2xl font-bold">{attendanceData.presentDays}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-red-50">
                  <CardContent className="p-4 flex items-center">
                    <XCircle className="h-10 w-10 mr-4 text-red-500" />
                    <div>
                      <p className="text-gray-600 text-sm">Absent Days</p>
                      <p className="text-2xl font-bold">{attendanceData.absentDays}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-blue-50">
                  <CardContent className="p-4 flex items-center">
                    <CalendarDays className="h-10 w-10 mr-4 text-blue-500" />
                    <div>
                      <p className="text-gray-600 text-sm">Leave Days</p>
                      <p className="text-2xl font-bold">{attendanceData.leaveDays}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Attendance Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-4">
                    {/* This component would display detailed attendance logs */}
                    <p className="text-gray-500">Detailed attendance logs will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeePerformance;
