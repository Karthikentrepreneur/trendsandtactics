
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { employeeService } from "@/services/employeeService";
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
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import type { User } from "@/types/user";
import type { BankInformation, ProfessionalExperience, DocumentUpload, EmployeeDocument, SalaryInformation } from "@/types/employee";
import { Loader2, Plus, Trash2, Upload, FileDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface PayslipRecord {
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

const EmployeePerformance = () => {
  const { employeeId } = useParams();
  const [employee, setEmployee] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bankInfo, setBankInfo] = useState<BankInformation | null>(null);
  const [experiences, setExperiences] = useState<ProfessionalExperience[]>([]);
  const [salaryInfo, setSalaryInfo] = useState<SalaryInformation | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [currentPayslip, setCurrentPayslip] = useState<PayslipRecord | null>(null);
  const { toast } = useToast();

  // Current month payslip form data
  const [payslipForm, setPayslipForm] = useState({
    month: format(new Date(), 'MMMM'),
    year: new Date().getFullYear().toString(),
    basic_salary: 0,
    hra: 0,
    da: 0,
    ta: 0,
    other_allowances: 0,
    epf_deduction: 0,
    other_deductions: 0,
    net_salary: 0
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchEmployeeData();
  }, [employeeId]);

  useEffect(() => {
    if (salaryInfo) {
      // Pre-fill the payslip form with salary info
      setPayslipForm(prev => ({
        ...prev,
        basic_salary: salaryInfo.gross_salary || 0,
        epf_deduction: salaryInfo.gross_salary ? (salaryInfo.gross_salary * (salaryInfo.epf_percentage || 10) / 100) : 0,
        net_salary: salaryInfo.net_pay || 0
      }));
    }
  }, [salaryInfo]);

  // Recalculate net salary whenever allowances or deductions change
  useEffect(() => {
    const totalAllowances = payslipForm.basic_salary + payslipForm.hra + payslipForm.da + payslipForm.ta + payslipForm.other_allowances;
    const totalDeductions = payslipForm.epf_deduction + payslipForm.other_deductions;
    const netSalary = totalAllowances - totalDeductions;
    
    setPayslipForm(prev => ({
      ...prev,
      net_salary: netSalary
    }));
  }, [payslipForm.basic_salary, payslipForm.hra, payslipForm.da, payslipForm.ta, payslipForm.other_allowances, payslipForm.epf_deduction, payslipForm.other_deductions]);

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
          fetchBankInfo(),
          fetchExperiences(),
          fetchSalaryInfo(),
          fetchDocuments(),
          fetchPayslips(),
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

  const fetchBankInfo = async () => {
    if (!employeeId) return;
    const { data } = await supabase
      .from("bank_information")
      .select("*")
      .eq("employee_id", employeeId)
      .single();
    setBankInfo(data);
  };

  const fetchExperiences = async () => {
    if (!employeeId) return;
    const { data } = await supabase
      .from("professional_experience")
      .select("*")
      .eq("employee_id", employeeId);
    setExperiences(data || []);
  };

  const fetchSalaryInfo = async () => {
    if (!employeeId) return;
    const { data } = await supabase
      .from("salary_information")
      .select("*")
      .eq("employee_id", employeeId)
      .single();
    setSalaryInfo(data);
  };

  const fetchDocuments = async () => {
    if (!employeeId) return;
    const { data } = await supabase
      .from("employee_documents")
      .select("*")
      .eq("employee_id", employeeId);
    setDocuments(data || []);
  };

  const fetchPayslips = async () => {
    if (!employeeId) return;
    try {
      const { data, error } = await supabase
        .from("payslips")
        .select("*")
        .eq("employee_id", employeeId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching payslips:", error);
        return;
      }
      
      setPayslips(data || []);
    } catch (error) {
      console.error("Error in fetchPayslips:", error);
    }
  };

  const updateBankInfo = async (formData: any) => {
    try {
      if (!employeeId) return;

      await employeeService.updateBankInfo(employeeId, formData);

      toast({
        title: "Success",
        description: "Bank information updated successfully",
      });
      
      await fetchBankInfo();
    } catch (error) {
      console.error("Error updating bank info:", error);
      toast({
        title: "Error",
        description: "Failed to update bank information",
        variant: "destructive",
      });
    }
  };

  const addExperience = async (formData: any) => {
    try {
      if (!employeeId) return;

      await employeeService.addExperience(employeeId, formData);

      toast({
        title: "Success",
        description: "Professional experience added successfully",
      });
      
      await fetchExperiences();
    } catch (error) {
      console.error("Error adding experience:", error);
      toast({
        title: "Error",
        description: "Failed to add professional experience",
        variant: "destructive",
      });
    }
  };

  const deleteExperience = async (id: string) => {
    try {
      const { error } = await supabase
        .from("professional_experience")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Experience deleted successfully",
      });
      
      await fetchExperiences();
    } catch (error) {
      console.error("Error deleting experience:", error);
      toast({
        title: "Error",
        description: "Failed to delete experience",
        variant: "destructive",
      });
    }
  };

  const uploadDocument = async (file: File, name: string, type: string) => {
    try {
      if (!employeeId) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${employeeId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: employeeId,
          document_name: name,
          document_type: type,
          file_path: filePath,
          uploaded_by: employeeId,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      
      await fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    }
  };

  const updateSalaryInfo = async (formData: any) => {
    try {
      if (!employeeId) return;

      await employeeService.updateSalaryInfo(employeeId, formData);

      toast({
        title: "Success",
        description: "Salary information updated successfully",
      });
      
      await fetchSalaryInfo();
    } catch (error) {
      console.error("Error updating salary info:", error);
      toast({
        title: "Error",
        description: "Failed to update salary information",
        variant: "destructive",
      });
    }
  };

  const handlePayslipFormChange = (field: string, value: any) => {
    setPayslipForm(prev => ({
      ...prev,
      [field]: typeof value === 'string' && !isNaN(Number(value)) ? Number(value) : value
    }));
  };

  const generatePayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!employeeId || !employee) return;

      // Check if payslip for this month and year already exists
      const { data: existingPayslip } = await supabase
        .from("payslips")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("month", payslipForm.month)
        .eq("year", payslipForm.year)
        .maybeSingle();

      let payslipId = existingPayslip?.id;
      let action = "created";

      if (existingPayslip) {
        // Update existing payslip
        const { error } = await supabase
          .from("payslips")
          .update({
            basic_salary: payslipForm.basic_salary,
            hra: payslipForm.hra,
            da: payslipForm.da,
            ta: payslipForm.ta,
            other_allowances: payslipForm.other_allowances,
            epf_deduction: payslipForm.epf_deduction,
            other_deductions: payslipForm.other_deductions,
            net_salary: payslipForm.net_salary
          })
          .eq("id", existingPayslip.id);

        if (error) throw error;
        action = "updated";
      } else {
        // Insert new payslip
        const { data, error } = await supabase
          .from("payslips")
          .insert({
            employee_id: employeeId,
            month: payslipForm.month,
            year: payslipForm.year,
            basic_salary: payslipForm.basic_salary,
            hra: payslipForm.hra,
            da: payslipForm.da,
            ta: payslipForm.ta,
            other_allowances: payslipForm.other_allowances,
            epf_deduction: payslipForm.epf_deduction,
            other_deductions: payslipForm.other_deductions,
            net_salary: payslipForm.net_salary
          })
          .select()
          .single();

        if (error) throw error;
        payslipId = data?.id;
      }

      toast({
        title: "Success",
        description: `Payslip ${action} successfully!`,
      });

      // Refresh payslips list
      await fetchPayslips();

      // Download the payslip PDF
      if (payslipId) {
        const payslip = existingPayslip || {
          ...payslipForm,
          id: payslipId,
          employee_id: employeeId,
          created_at: new Date().toISOString()
        };
        downloadPayslipPDF(payslip as PayslipRecord);
      }
    } catch (error) {
      console.error("Error generating payslip:", error);
      toast({
        title: "Error",
        description: "Failed to generate payslip",
        variant: "destructive",
      });
    }
  };

  const downloadPayslipPDF = (payslip: PayslipRecord) => {
    if (!employee || !bankInfo) return;

    try {
      const doc = new jsPDF();
      
      // Add company header
      doc.setFontSize(20);
      doc.setTextColor(0, 102, 204);
      doc.text("COMPANY NAME", 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Company Address Line 1, City, Country", 105, 27, { align: 'center' });
      doc.text("Email: info@company.com | Phone: +1 234 567 890", 105, 32, { align: 'center' });
      
      // Title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`SALARY SLIP - ${payslip.month.toUpperCase()} ${payslip.year}`, 105, 45, { align: 'center' });
      
      // Employee details
      doc.setFontSize(10);
      doc.text(`Employee Name: ${employee.name || 'N/A'}`, 15, 60);
      doc.text(`Employee ID: ${employee.employee_id || 'N/A'}`, 15, 65);
      doc.text(`Designation: ${employee.designation || 'N/A'}`, 15, 70);
      
      // Bank details
      doc.text(`Bank Name: ${bankInfo.bank_name || 'N/A'}`, 130, 60);
      doc.text(`Account No: ${bankInfo.account_number || 'N/A'}`, 130, 65);
      doc.text(`IFSC Code: ${bankInfo.ifsc_code || 'N/A'}`, 130, 70);
      
      // Earnings & Deductions table
      doc.setFontSize(12);
      doc.text("Earnings", 50, 85, { align: 'center' });
      doc.text("Deductions", 150, 85, { align: 'center' });
      
      // @ts-ignore - jsPDF-autotable types compatibility
      const earningsTable = doc.autoTable({
        startY: 90,
        head: [['Particulars', 'Amount']],
        body: [
          ['Basic Salary', `₹ ${payslip.basic_salary.toFixed(2)}`],
          ['HRA', `₹ ${payslip.hra.toFixed(2)}`],
          ['DA', `₹ ${payslip.da.toFixed(2)}`],
          ['TA', `₹ ${payslip.ta.toFixed(2)}`],
          ['Other Allowances', `₹ ${payslip.other_allowances.toFixed(2)}`],
          ['', ''],
          ['Total Earnings', `₹ ${(payslip.basic_salary + payslip.hra + payslip.da + payslip.ta + payslip.other_allowances).toFixed(2)}`],
        ],
        margin: { left: 15 },
        tableWidth: 80,
      });
      
      // @ts-ignore - jsPDF-autotable types compatibility
      doc.autoTable({
        startY: 90,
        head: [['Particulars', 'Amount']],
        body: [
          ['EPF', `₹ ${payslip.epf_deduction.toFixed(2)}`],
          ['Other Deductions', `₹ ${payslip.other_deductions.toFixed(2)}`],
          ['', ''],
          ['', ''],
          ['', ''],
          ['', ''],
          ['Total Deductions', `₹ ${(payslip.epf_deduction + payslip.other_deductions).toFixed(2)}`],
        ],
        margin: { left: 115 },
        tableWidth: 80,
      });
      
      // Net Salary
      const endY = (earningsTable as any).finalY + 20;
      doc.setFontSize(12);
      doc.text(`Net Salary: ₹ ${payslip.net_salary.toFixed(2)}`, 105, endY, { align: 'center' });
      
      // Amount in words
      doc.setFontSize(10);
      doc.text(`Amount in words: ${numberToWords(payslip.net_salary)} Rupees Only`, 105, endY + 8, { align: 'center' });
      
      // Footer
      doc.setFontSize(9);
      doc.text("This is a computer generated payslip. No signature required.", 105, endY + 25, { align: 'center' });
      
      // Save the PDF
      doc.save(`Payslip_${employee.name}_${payslip.month}_${payslip.year}.pdf`);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  // Helper function to convert number to words
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
    const numToWords = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + numToWords(n % 100) : '');
      if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
      if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + numToWords(n % 100000) : '');
      return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + numToWords(n % 10000000) : '');
    };
  
    const rupees = Math.floor(num);
    const paise = Math.round((num % 1) * 100);
    
    let result = numToWords(rupees);
    if (paise > 0) {
      result += ' and ' + numToWords(paise) + ' Paise';
    }
    
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
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
      <Tabs defaultValue="payslip" className="w-full">
        <TabsList className="grid grid-cols-3 gap-4 w-full">
          <TabsTrigger value="payslip">Payslip</TabsTrigger>
          <TabsTrigger value="bank">Bank Information</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="payslip">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Generate Payslip Form */}
            <Card>
              <CardHeader>
                <CardTitle>Generate {payslipForm.month} {payslipForm.year} Payslip</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={generatePayslip} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="month">Month</Label>
                      <Select
                        value={payslipForm.month}
                        onValueChange={(value) => handlePayslipFormChange('month', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month} value={month}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Select
                        value={payslipForm.year}
                        onValueChange={(value) => handlePayslipFormChange('year', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Earnings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="basic_salary">Basic Salary</Label>
                        <Input
                          id="basic_salary"
                          type="number"
                          value={payslipForm.basic_salary}
                          onChange={(e) => handlePayslipFormChange('basic_salary', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hra">HRA</Label>
                        <Input
                          id="hra"
                          type="number"
                          value={payslipForm.hra}
                          onChange={(e) => handlePayslipFormChange('hra', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="da">DA</Label>
                        <Input
                          id="da"
                          type="number"
                          value={payslipForm.da}
                          onChange={(e) => handlePayslipFormChange('da', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ta">TA</Label>
                        <Input
                          id="ta"
                          type="number"
                          value={payslipForm.ta}
                          onChange={(e) => handlePayslipFormChange('ta', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="other_allowances">Other Allowances</Label>
                        <Input
                          id="other_allowances"
                          type="number"
                          value={payslipForm.other_allowances}
                          onChange={(e) => handlePayslipFormChange('other_allowances', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Deductions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="epf_deduction">EPF Deduction</Label>
                        <Input
                          id="epf_deduction"
                          type="number"
                          value={payslipForm.epf_deduction}
                          onChange={(e) => handlePayslipFormChange('epf_deduction', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="other_deductions">Other Deductions</Label>
                        <Input
                          id="other_deductions"
                          type="number"
                          value={payslipForm.other_deductions}
                          onChange={(e) => handlePayslipFormChange('other_deductions', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="net_salary">Net Salary</Label>
                    <Input
                      id="net_salary"
                      type="number"
                      value={payslipForm.net_salary}
                      disabled
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">Generate Payslip</Button>
                </form>
              </CardContent>
            </Card>
            
            {/* Payslips History */}
            <Card>
              <CardHeader>
                <CardTitle>Payslip History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payslips.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No payslips generated yet</p>
                  ) : (
                    payslips.map((payslip) => (
                      <div key={payslip.id} className="flex justify-between items-center p-4 border rounded-md">
                        <div>
                          <p className="font-medium">{payslip.month} {payslip.year}</p>
                          <p className="text-sm text-muted-foreground">₹{payslip.net_salary.toFixed(2)}</p>
                        </div>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => downloadPayslipPDF(payslip)}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>Bank Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData);
                updateBankInfo(data);
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input id="bank_name" name="bank_name" defaultValue={bankInfo?.bank_name || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch_name">Branch Name</Label>
                    <Input id="branch_name" name="branch_name" defaultValue={bankInfo?.branch_name || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input id="account_number" name="account_number" defaultValue={bankInfo?.account_number || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifsc_code">IFSC Code</Label>
                    <Input id="ifsc_code" name="ifsc_code" defaultValue={bankInfo?.ifsc_code || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_type">Account Type</Label>
                    <Input id="account_type" name="account_type" defaultValue={bankInfo?.account_type || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_address">Bank Address</Label>
                    <Input id="bank_address" name="bank_address" defaultValue={bankInfo?.bank_address || ''} />
                  </div>
                </div>
                <Button type="submit">Update Bank Information</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const file = formData.get('file') as File;
                const name = formData.get('name') as string;
                const type = formData.get('type') as string;
                if (file && name && type) {
                  uploadDocument(file, name, type);
                  e.currentTarget.reset();
                }
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Document Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Document Type</Label>
                    <Input id="type" name="type" required />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="file">File</Label>
                    <Input id="file" name="file" type="file" required />
                  </div>
                </div>
                <Button type="submit">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </form>

              <div className="mt-6 space-y-4">
                {documents.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{doc.document_name}</h3>
                        <p className="text-sm text-gray-600">{doc.document_type}</p>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const { data } = await supabase.storage
                            .from('employee-documents')
                            .getPublicUrl(doc.file_path);
                          window.open(data.publicUrl, '_blank');
                        }}
                      >
                        Download
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeePerformance;
