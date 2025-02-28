
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/types/user";
import { Button } from "@/components/ui/button";
import { FileText, Users } from "lucide-react";

const Reports = () => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        console.log('Fetching employees for reports...');
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('name');
        
        if (error) {
          console.error('Error fetching employees:', error);
          throw error;
        }
        
        if (data) {
          console.log('Fetched employees:', data);
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
    <div className="space-y-6 p-2 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Employee Reports</h2>
      </div>

      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-sm"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Employee List</span>
            </div>
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {filteredEmployees.length} employees
          </span>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-300px)] w-full">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEmployees.map((employee) => (
                <Card
                  key={employee.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/admin/employee-reports/${employee.id}`)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      {employee.profile_photo ? (
                        <img
                          src={employee.profile_photo}
                          alt={employee.name || ''}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl font-medium text-gray-600">
                            {employee.name?.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-base sm:text-lg truncate">{employee.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{employee.designation}</p>
                        <p className="text-sm text-muted-foreground truncate mt-1">ID: {employee.employee_id}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/employee-reports/${employee.id}`);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Reports
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredEmployees.length === 0 && (
                <p className="text-center text-muted-foreground col-span-full p-4">No employees found</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
