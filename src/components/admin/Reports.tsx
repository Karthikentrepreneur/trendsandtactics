
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/types/user";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Search, Users } from "lucide-react";

const Reports = () => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        console.log("Fetching all profiles...");
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('name');
        
        if (error) {
          console.error('Error fetching profiles:', error);
          throw error;
        }
        
        if (data) {
          console.log('Fetched profiles:', data);
          setEmployees(data);
        }
      } catch (error) {
        console.error('Error in reports page:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((employee) =>
    employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.designation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewEmployee = (employeeId: string) => {
    navigate(`/admin/employee-reports/${employeeId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Performance Reports</h2>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-[300px] pl-8"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Employee Reports
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {filteredEmployees.length} employees
          </span>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-250px)] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {employee.profile_photo ? (
                          <img
                            src={employee.profile_photo}
                            alt={employee.name || ''}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {employee.name?.charAt(0)}
                            </span>
                          </div>
                        )}
                        {employee.name}
                      </div>
                    </TableCell>
                    <TableCell>{employee.employee_id}</TableCell>
                    <TableCell>{employee.designation}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm"
                        onClick={() => handleViewEmployee(employee.id)}
                        className="flex items-center gap-1"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>View Report</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No employees found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
