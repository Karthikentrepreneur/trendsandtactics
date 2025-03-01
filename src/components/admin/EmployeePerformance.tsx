
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
import type { User, PayslipFormValues } from "@/types/user";
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
  CreditCard
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

interface SalaryInformation {
  id: string;
  employee_id: string;
  gross_salary: number;
  epf_percentage: number;
  total_deduction: number;
  net_pay: number;
  created_at: string;
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
        setEmployee(employeeData);
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
      ["Total Deductions", ` ${(payslip.epf_deduction + payslip.other_deductions).toFixed(2)}`]
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

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-medium">Attendance Summary</h3>
                          <div className="grid grid-cols-3 gap-4 mt-2">
                            <div>
                              <span className="block text-sm text-gray-500">Present Days</span>
                              <span className="font-semibold">{attendanceData.presentDays}</span>
                            </div>
                            <div>
                              <span className="block text-sm text-gray-500">Absent Days</span>
                              <span className="font-semibold">{attendanceData.absentDays}</span>
                            </div>
                            <div>
                              <span className="block text-sm text-gray-500">Leave Days</span>
                              <span className="font-semibold">{attendanceData.leaveDays}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">Net Salary:</h3>
                          <p className="text-lg font-bold">₹ {netSalary.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full">Generate Payslip</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslipHistory">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Payslip History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payslips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {payslips.map((payslip) => (
                    <Card key={payslip.id} className="overflow-hidden">
                      <CardHeader className="bg-gray-50 py-3">
                        <CardTitle className="text-lg">{payslip.month} {payslip.year}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Basic Salary:</span>
                            <span>₹ {payslip.basic_salary.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Earnings:</span>
                            <span>₹ {(payslip.basic_salary + payslip.hra + payslip.da + payslip.ta + payslip.other_allowances).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Deductions:</span>
                            <span>₹ {(payslip.epf_deduction + payslip.other_deductions).toFixed(2)}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between font-bold">
                            <span>Net Salary:</span>
                            <span>₹ {payslip.net_salary.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-between">
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
                            onClick={() => {
                              form.reset({
                                month: payslip.month,
                                year: payslip.year,
                                basic_salary: payslip.basic_salary,
                                hra: payslip.hra,
                                da: payslip.da,
                                ta: payslip.ta,
                                other_allowances: payslip.other_allowances,
                                epf_deduction: payslip.epf_deduction,
                                other_deductions: payslip.other_deductions,
                              });
                              document.getElementById("payslip-tab")?.click();
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No payslips generated yet.</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => document.getElementById("payslip-tab")?.click()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Generate Payslip
                  </Button>
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
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Add New Experience</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Company Name</Label>
                      <Input 
                        id="company_name" 
                        value={newExperience.company_name}
                        onChange={(e) => setNewExperience({...newExperience, company_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input 
                        id="position" 
                        value={newExperience.position}
                        onChange={(e) => setNewExperience({...newExperience, position: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input 
                        id="start_date" 
                        type="date"
                        value={newExperience.start_date}
                        onChange={(e) => setNewExperience({...newExperience, start_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date (Leave blank if current)</Label>
                      <Input 
                        id="end_date" 
                        type="date"
                        value={newExperience.end_date}
                        onChange={(e) => setNewExperience({...newExperience, end_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="responsibilities">Responsibilities</Label>
                    <Textarea 
                      id="responsibilities" 
                      value={newExperience.responsibilities}
                      onChange={(e) => setNewExperience({...newExperience, responsibilities: e.target.value})}
                    />
                  </div>
                  <Button onClick={handleAddExperience}>Add Experience</Button>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Experience History</h3>
                  {professionalExperience.length > 0 ? (
                    <div className="space-y-4">
                      {professionalExperience.map((exp) => (
                        <Card key={exp.id}>
                          <CardContent className="pt-6">
                            <div className="flex justify-between">
                              <h4 className="font-bold">{exp.position}</h4>
                              <p className="text-sm text-gray-500">
                                {format(new Date(exp.start_date), "MMM yyyy")} - 
                                {exp.end_date ? format(new Date(exp.end_date), " MMM yyyy") : " Present"}
                              </p>
                            </div>
                            <p className="text-gray-600">{exp.company_name}</p>
                            {exp.responsibilities && (
                              <p className="mt-2 text-sm">{exp.responsibilities}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No professional experience added yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <FileUp className="mr-2 h-5 w-5" />
                Document Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Upload New Document</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="document_type">Document Type</Label>
                      <Select onValueChange={setDocumentType} value={documentType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="document_name">Document Name</Label>
                      <Input 
                        id="document_name" 
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        placeholder="Enter document name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="document_file">Select File</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50">
                      <input 
                        id="document_file" 
                        type="file" 
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                      <label htmlFor="document_file" className="cursor-pointer">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          {selectedFile ? selectedFile.name : "Click to browse or drag and drop"}
                        </p>
                      </label>
                    </div>
                  </div>
                  <Button 
                    onClick={handleUploadDocument} 
                    disabled={uploadingDocument || !selectedFile || !documentType || !documentName}
                  >
                    {uploadingDocument ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Uploaded Documents</h3>
                  {documents.length > 0 ? (
                    <div className="space-y-4">
                      {documents.map((doc) => (
                        <Card key={doc.id} className="overflow-hidden">
                          <CardContent className="p-0">
                            <div className="flex items-center justify-between p-4">
                              <div>
                                <h4 className="font-medium">{doc.document_name}</h4>
                                <p className="text-sm text-gray-500">{doc.document_type}</p>
                                <p className="text-xs text-gray-400">
                                  Uploaded on: {format(new Date(doc.uploaded_at), "MMM dd, yyyy")}
                                </p>
                              </div>
                              <a 
                                href={doc.file_path} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </a>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No documents uploaded yet.</p>
                  )}
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
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">
                    {salaryInfo ? "Update Salary Information" : "Add Salary Information"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="gross_salary">Gross Salary</Label>
                      <Input 
                        id="gross_salary" 
                        type="number"
                        value={salaryInfo?.gross_salary || 0}
                        onChange={(e) => setSalaryInfo({
                          ...salaryInfo as SalaryInformation,
                          gross_salary: parseFloat(e.target.value)
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="epf_percentage">EPF Percentage</Label>
                      <Input 
                        id="epf_percentage" 
                        type="number"
                        min="0"
                        max="100"
                        value={salaryInfo?.epf_percentage || 10}
                        onChange={(e) => setSalaryInfo({
                          ...salaryInfo as SalaryInformation,
                          epf_percentage: parseFloat(e.target.value)
                        })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="total_deduction">Total Deduction</Label>
                      <Input 
                        id="total_deduction" 
                        type="number"
                        value={salaryInfo?.total_deduction || 0}
                        onChange={(e) => setSalaryInfo({
                          ...salaryInfo as SalaryInformation,
                          total_deduction: parseFloat(e.target.value)
                        })}
                      />
                      <p className="text-xs text-gray-500">
                        Default: {salaryInfo ? ((salaryInfo.gross_salary * salaryInfo.epf_percentage) / 100).toFixed(2) : "0.00"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="net_pay">Net Pay (Calculated)</Label>
                      <Input 
                        id="net_pay" 
                        type="number"
                        value={salaryInfo ? salaryInfo.gross_salary - (salaryInfo.total_deduction || 0) : 0}
                        disabled
                      />
                      <p className="text-xs text-gray-500">
                        Gross Salary - Total Deduction
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => handleUpdateSalaryInfo(salaryInfo as SalaryInformation)}>
                    {salaryInfo ? "Update Salary Information" : "Save Salary Information"}
                  </Button>
                </div>
                
                {salaryInfo && (
                  <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Current Salary Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gross Salary:</span>
                        <span>₹ {salaryInfo.gross_salary.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">EPF Contribution ({salaryInfo.epf_percentage}%):</span>
                        <span>₹ {((salaryInfo.gross_salary * salaryInfo.epf_percentage) / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Deductions:</span>
                        <span>₹ {salaryInfo.total_deduction?.toFixed(2) || ((salaryInfo.gross_salary * salaryInfo.epf_percentage) / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>Net Salary:</span>
                        <span>₹ {salaryInfo.net_pay?.toFixed(2) || (salaryInfo.gross_salary - (salaryInfo.total_deduction || ((salaryInfo.gross_salary * salaryInfo.epf_percentage) / 100))).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Last updated: {format(new Date(salaryInfo.updated_at || salaryInfo.created_at), "MMMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date_of_joining">Date of Joining</Label>
                  <Input
                    id="date_of_joining"
                    type="date"
                    value={employee.date_of_joining || ''}
                    onChange={async (e) => {
                      try {
                        await supabase
                          .from('profiles')
                          .update({
                            date_of_joining: e.target.value
                          })
                          .eq('id', employeeId);
                        
                        setEmployee({
                          ...employee,
                          date_of_joining: e.target.value
                        });
                        
                        toast({
                          title: "Success",
                          description: "Date of joining updated",
                        });
                      } catch (error) {
                        console.error(error);
                        toast({
                          title: "Error",
                          description: "Failed to update date of joining",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select 
                    value={employee.department || ''}
                    onValueChange={async (value) => {
                      try {
                        await supabase
                          .from('profiles')
                          .update({
                            department: value
                          })
                          .eq('id', employeeId);
                        
                        setEmployee({
                          ...employee,
                          department: value
                        });
                        
                        toast({
                          title: "Success",
                          description: "Department updated",
                        });
                      } catch (error) {
                        console.error(error);
                        toast({
                          title: "Error",
                          description: "Failed to update department",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={employee.date_of_birth || ''}
                    onChange={async (e) => {
                      try {
                        await supabase
                          .from('profiles')
                          .update({
                            date_of_birth: e.target.value
                          })
                          .eq('id', employeeId);
                        
                        setEmployee({
                          ...employee,
                          date_of_birth: e.target.value
                        });
                        
                        toast({
                          title: "Success",
                          description: "Date of birth updated",
                        });
                      } catch (error) {
                        console.error(error);
                        toast({
                          title: "Error",
                          description: "Failed to update date of birth",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fathers_name">Father's Name</Label>
                  <Input
                    id="fathers_name"
                    value={employee.fathers_name || ''}
                    onChange={async (e) => {
                      try {
                        await supabase
                          .from('profiles')
                          .update({
                            fathers_name: e.target.value
                          })
                          .eq('id', employeeId);
                        
                        setEmployee({
                          ...employee,
                          fathers_name: e.target.value
                        });
                        
                        toast({
                          title: "Success",
                          description: "Father's name updated",
                        });
                      } catch (error) {
                        console.error(error);
                        toast({
                          title: "Error",
                          description: "Failed to update father's name",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mothers_name">Mother's Name</Label>
                  <Input
                    id="mothers_name"
                    value={employee.mothers_name || ''}
                    onChange={async (e) => {
                      try {
                        await supabase
                          .from('profiles')
                          .update({
                            mothers_name: e.target.value
                          })
                          .eq('id', employeeId);
                        
                        setEmployee({
                          ...employee,
                          mothers_name: e.target.value
                        });
                        
                        toast({
                          title: "Success",
                          description: "Mother's name updated",
                        });
                      } catch (error) {
                        console.error(error);
                        toast({
                          title: "Error",
                          description: "Failed to update mother's name",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={employee.address || ''}
                    onChange={async (e) => {
                      try {
                        await supabase
                          .from('profiles')
                          .update({
                            address: e.target.value
                          })
                          .eq('id', employeeId);
                        
                        setEmployee({
                          ...employee,
                          address: e.target.value
                        });
                        
                        toast({
                          title: "Success",
                          description: "Address updated",
                        });
                      } catch (error) {
                        console.error(error);
                        toast({
                          title: "Error",
                          description: "Failed to update address",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_number">Contact Number</Label>
                  <Input
                    id="contact_number"
                    value={employee.contact_number || ''}
                    onChange={async (e) => {
                      try {
                        await supabase
                          .from('profiles')
                          .update({
                            contact_number: e.target.value
                          })
                          .eq('id', employeeId);
                        
                        setEmployee({
                          ...employee,
                          contact_number: e.target.value
                        });
                        
                        toast({
                          title: "Success",
                          description: "Contact number updated",
                        });
                      } catch (error) {
                        console.error(error);
                        toast({
                          title: "Error",
                          description: "Failed to update contact number",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Emergency Contact</Label>
                  <Input
                    id="emergency_contact"
                    value={employee.emergency_contact || ''}
                    onChange={async (e) => {
                      try {
                        await supabase
                          .from('profiles')
                          .update({
                            emergency_contact: e.target.value
                          })
                          .eq('id', employeeId);
                        
                        setEmployee({
                          ...employee,
                          emergency_contact: e.target.value
                        });
                        
                        toast({
                          title: "Success",
                          description: "Emergency contact updated",
                        });
                      } catch (error) {
                        console.error(error);
                        toast({
                          title: "Error",
                          description: "Failed to update emergency contact",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Present Days</p>
                        <h3 className="text-2xl font-bold">{attendanceData.presentDays}</h3>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Absent Days</p>
                        <h3 className="text-2xl font-bold">{attendanceData.absentDays}</h3>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Leave Days</p>
                        <h3 className="text-2xl font-bold">{attendanceData.leaveDays}</h3>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <CalendarDays className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <h3 className="text-lg font-medium mb-4">Monthly Attendance</h3>
              {employee?.email ? (
                <AttendanceTable 
                  showTodayOnly={false} 
                  userEmail={employee.email}
                />
              ) : (
                <p className="text-center text-gray-500 py-4">Email information not available for this employee.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <button id="payslip-tab" className="hidden" onClick={() => document.querySelector('[value="payslip"]')?.dispatchEvent(new MouseEvent("click"))} />
    </div>
  );
};

export default EmployeePerformance;
