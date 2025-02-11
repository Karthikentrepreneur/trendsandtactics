
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/user";
import { useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteUser } from "@/services/userService";

interface EmployeeListProps {
  employees: User[];
  onEmployeeDeleted: () => void;
  loading: boolean;
}

const EmployeeList = ({ employees, onEmployeeDeleted, loading }: EmployeeListProps) => {
  const { toast } = useToast();

  useEffect(() => {
    // Set up real-time subscription for employee updates
    const channel = supabase
      .channel('public:profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('Profiles updated, refreshing...');
          onEmployeeDeleted(); // Refresh the list
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onEmployeeDeleted]);

  const handleDeleteEmployee = async (userId: string) => {
    try {
      console.log('Deleting employee:', userId);
      await deleteUser(userId);
      onEmployeeDeleted();
      
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete employee",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <p>Loading employees...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Employees ({employees.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <p className="text-muted-foreground">No employees found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={employee.profile_photo || undefined} />
                        <AvatarFallback>{employee.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.employee_id}</TableCell>
                    <TableCell>{employee.designation}</TableCell>
                    <TableCell>
                      <Badge variant={employee.role === 'admin' ? 'destructive' : 'default'}>
                        {employee.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the employee
                              account and remove their data from the system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => employee.id && handleDeleteEmployee(employee.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeList;
