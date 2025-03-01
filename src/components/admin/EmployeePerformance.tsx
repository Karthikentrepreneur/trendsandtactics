
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
import { CalendarIcon, Download, FileText, Plus, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// Define types
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

// Form schema - updated to correctly handle number type conversion
const payslipFormSchema = z.object({
  month: z.string().min(1, "Month is required"),
  year: z.string().min(1, "Year is required"),
  basic_salary: z.string().transform(val => Number(val || 0)),
  hra: z.string().transform(val => Number(val || 0)),
  da: z.string().transform(val => Number(val || 0)),
  ta: z.string().transform(val => Number(val || 0)),
  other_allowances: z.string().transform(val => Number(val || 0)),
  epf_deduction: z.string().transform(val => Number(val || 0)),
  other_deductions: z.string().transform(val => Number(val || 0)),
});

const EmployeePerformance = () => {
  const { employeeId } = useParams();
  const [employee, setEmployee] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [currentDate] = useState(new Date());
  const [netSalary, setNetSalary] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  
  const years = Array.from({ length: 11 }, (_, i) => (currentDate.getFullYear() - 5 + i).toString());

  // Setup form
  const form = useForm<PayslipFormValues>({
    resolver: zodResolver(payslipFormSchema),
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

  // Watch form values to calculate net salary
  const watchAllFields = form.watch();
  
  useEffect(() => {
    const { basic_salary, hra, da, ta, other_allowances, epf_deduction, other_deductions } = watchAllFields;
    
    const totalEarnings = 
      (basic_salary || 0) + 
      (hra || 0) + 
      (da || 0) + 
      (ta || 0) + 
      (other_allowances || 0);
    
    const totalDeductions = 
      (epf_deduction || 0) + 
      (other_deductions || 0);
    
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
        await fetchPayslips();
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

  const handleCreatePayslip = async (values: PayslipFormValues) => {
    try {
      if (!employeeId || !employee) return;

      // Check if payslip for this month and year already exists
      const { data: existingPayslip } = await supabase
        .from("payslips")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("month", values.month)
        .eq("year", values.year)
        .maybeSingle();

      // Calculate net salary
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
        // Update existing payslip
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
        // Create new payslip
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
      
      // Refresh payslips list
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

  const generatePayslipPDF = (payslip: Payslip) => {
    if (!employee) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add company logo and header
    doc.setFillColor(52, 101, 164);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("HRMS", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(14);
    doc.text("Payslip for " + payslip.month + " " + payslip.year, pageWidth / 2, 25, { align: "center" });
    
    // Employee information
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Employee Details", 14, 40);
    
    const employeeInfo = [
      ["Employee Name:", employee.name || ""],
      ["Employee ID:", employee.employee_id || ""],
      ["Designation:", employee.designation || ""],
      ["Department:", ""],
      ["Bank Account:", ""],
    ];
    
    autoTable(doc, {
      startY: 45,
      head: [],
      body: employeeInfo,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 40 } }
    });
    
    // Salary details
    doc.text("Salary Details", 14, 90);
    
    const earningsTable = [
      ["Earnings", "Amount"],
      ["Basic Salary", `₹ ${payslip.basic_salary.toFixed(2)}`],
      ["HRA", `₹ ${payslip.hra.toFixed(2)}`],
      ["DA", `₹ ${payslip.da.toFixed(2)}`],
      ["TA", `₹ ${payslip.ta.toFixed(2)}`],
      ["Other Allowances", `₹ ${payslip.other_allowances.toFixed(2)}`],
      ["Total Earnings", `₹ ${(payslip.basic_salary + payslip.hra + payslip.da + payslip.ta + payslip.other_allowances).toFixed(2)}`]
    ];
    
    const deductionsTable = [
      ["Deductions", "Amount"],
      ["EPF", `₹ ${payslip.epf_deduction.toFixed(2)}`],
      ["Other Deductions", `₹ ${payslip.other_deductions.toFixed(2)}`],
      ["Total Deductions", `₹ ${(payslip.epf_deduction + payslip.other_deductions).toFixed(2)}`]
    ];
    
    // Earnings table
    autoTable(doc, {
      startY: 95,
      head: [["Earnings", "Amount"]],
      body: earningsTable.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [70, 130, 180] },
      styles: { fontSize: 10 },
      margin: { left: 14 },
      tableWidth: 80
    });
    
    // Deductions table
    autoTable(doc, {
      startY: 95,
      head: [["Deductions", "Amount"]],
      body: deductionsTable.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [70, 130, 180] },
      styles: { fontSize: 10 },
      margin: { left: pageWidth - 94 },
      tableWidth: 80
    });
    
    // Net Salary
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 170, pageWidth - 28, 10, 'F');
    doc.setFontSize(11);
    doc.text("Net Salary:", 16, 177);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`₹ ${payslip.net_salary.toFixed(2)}`, pageWidth - 16, 177, { align: "right" });
    
    // Footer
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("This is a computer-generated payslip and doesn't require a signature.", pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.text("Generated on: " + format(new Date(), "dd/MM/yyyy"), pageWidth / 2, pageHeight - 5, { align: "center" });
    
    // Save PDF
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
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/reports")}>
          Back to Reports
        </Button>
      </div>

      <Tabs defaultValue="payslip" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="payslip">Payslip Management</TabsTrigger>
          <TabsTrigger value="payslipHistory">Payslip History</TabsTrigger>
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
                              <FormLabel>Basic Salary</FormLabel>
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
                        <h3 className="text-lg font-medium">Net Salary:</h3>
                        <p className="text-lg font-bold">₹ {netSalary.toFixed(2)}</p>
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
      </Tabs>
      
      {/* Hidden button for programmatic tab switching */}
      <button id="payslip-tab" className="hidden" onClick={() => document.querySelector('[value="payslip"]')?.dispatchEvent(new MouseEvent("click"))} />
    </div>
  );
};

export default EmployeePerformance;
