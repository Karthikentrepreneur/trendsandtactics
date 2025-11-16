
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task } from "@/types/user";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TasksListProps {
  tasks: Task[];
}

export const TasksList = ({ tasks }: TasksListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full">
          <div className="space-y-3 px-1">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex flex-col p-3 border rounded-lg bg-white shadow-sm">
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="font-medium text-sm sm:text-base line-clamp-2">{task.title}</p>
                    <span className={`px-2 py-1 rounded-full text-xs w-fit ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                  </p>
                  {task.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-muted-foreground text-center text-sm">No tasks assigned yet.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
