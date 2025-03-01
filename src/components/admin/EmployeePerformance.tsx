<lov-code>
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
  employee_id: string;
  month: string;
  year: string;
  basic_salary: number;
  hra: number;
  da: number;
  ta: number;
  other_allowances: number;
  epf_deduction: number;
  other_deductions: number;
  net_salary: number;
  created_at: string;
}

interface ProfessionalExperience {
  id: string;
  employee_id: string;
  company_name: string;
  position: string;
  start_date: string;
  end_date: string | null;
  responsibilities: string | null;
  created_at: string;
}

interface EmployeeDocument {
  id: string;
  employee_id: string;
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
  const [navigate] = useNavigate();
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
      .eq("employee_id", employeeId)
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
      .eq("employee_id", employeeId)
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
      .eq("employee_id", employeeId)
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
        .eq("employee_id", employeeId)
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

      const { data: existingPayslip } = await supabase
        .from("payslips")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("month", values.month)
        .eq("year", values.year)
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
            employee_id: employeeId,
            month: values.month,
            year: values.year,
            basic_salary: values.basic_salary,
            hra: values.hra,
            da: values.da,
            ta: values.ta,
            other_allowances: values.other_allowances,
            epf_deduction: values.epf_deduction,
            other_deductions: values.other_deductions,
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
          employee_id: employeeId,
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
          employee_id: employeeId,
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
            employee_id: employeeId,
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
      ["Designation:", employee.designation || ""],
      ["Department:", employee.department || ""],
      ["Date of Joining:", employee.date_of_joining ? format(new Date(employee.date_of_joining), "dd/MM/yyyy") : ""],
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
          {employee.department && <p className="text-gray-600">Department: {employee.department}</p>}
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
