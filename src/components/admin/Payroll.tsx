import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { User } from "@/types/user";

const Payroll = () => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .order('name');
        
        if (data) {
          setEmployees(data);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const generatePerformanceReport = async (employee: User) => {
    try {
      // Fetch tasks for the employee
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', employee.id)
        .gte('created_at', new Date(new Date().setDate(1)).toISOString()) // Start of current month
        .lte('created_at', new Date().toISOString()); // Current date

      // Create PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text(`Performance Report - ${employee.name}`, 14, 15);
      doc.setFontSize(12);
      doc.text(`Month: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`, 14, 25);
      
      // Add employee details
      doc.text(`Employee ID: ${employee.employee_id || 'N/A'}`, 14, 35);
      doc.text(`Designation: ${employee.designation || 'N/A'}`, 14, 45);
      
      // Add tasks table
      const taskData = tasks?.map(task => [
        task.title,
        task.status,
        new Date(task.due_date).toLocaleDateString(),
        task.description || 'N/A'
      ]) || [];

      autoTable(doc, {
        head: [['Task Title', 'Status', 'Due Date', 'Description']],
        body: taskData,
        startY: 60,
      });

      // Save PDF
      doc.save(`${employee.name}_performance_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Payroll Management</h2>
      </div>

      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEmployees.map((employee) => (
                <Card
                  key={employee.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {employee.profile_photo ? (
                        <img
                          src={employee.profile_photo}
                          alt={employee.name || ''}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xl font-medium text-gray-600">
                            {employee.name?.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium">{employee.name}</h3>
                        <p className="text-sm text-muted-foreground">{employee.designation}</p>
                        <p className="text-sm text-muted-foreground">ID: {employee.employee_id}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/payroll/${employee.id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generatePerformanceReport(employee)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download Report
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredEmployees.length === 0 && (
                <p className="text-center text-muted-foreground col-span-full">No employees found</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payroll;