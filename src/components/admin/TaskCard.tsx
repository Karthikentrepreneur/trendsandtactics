import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Edit, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { User } from "@/types/user";
import { supabase } from "@/integrations/supabase/client";
import EditTaskModal from "./EditTaskModal";

const TaskCard = ({ task }) => {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*');
        
        if (error) throw error;
        setEmployees(data as User[] || []);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    
    fetchEmployees();
  }, []);

  const assignedEmployee = employees.find((employee) => employee.id === task.assigned_to);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{task.title}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MoreVertical className="h-4 w-4 cursor-pointer" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>
          {task.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>{assignedEmployee?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium leading-none">{assignedEmployee?.name}</p>
            <p className="text-sm text-muted-foreground">
              {assignedEmployee?.email}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
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
        <p className="text-sm text-muted-foreground">
          Due: {new Date(task.due_date).toLocaleDateString()}
        </p>
      </CardFooter>
      <EditTaskModal
        open={open}
        onOpenChange={setOpen}
        task={task}
        onTaskUpdated={() => {}}
      />
    </Card>
  );
};

export default TaskCard;
