import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ChartFilters } from "./ChartFilters";
import { exportToCSV, exportToPDF } from "@/utils/exportHelpers";
import { toast } from "sonner";

interface TaskData {
  week: string;
  completed: number;
  pending: number;
  inProgress: number;
  completionRate: number;
}

export const TaskCompletionChart = () => {
  const [data, setData] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 56);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        if (!startDate || !endDate) return;

        const { data: tasksData, error } = await supabase
          .from('tasks')
          .select('created_at, status')
          .gte('created_at', startDate.toISOString());

        if (error) throw error;

        // Group by week
        const weeklyData: Record<string, any> = {};
        
        tasksData?.forEach((task) => {
          const date = new Date(task.created_at || '');
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { week: weekKey, completed: 0, pending: 0, inProgress: 0 };
          }

          if (task.status === 'completed') weeklyData[weekKey].completed++;
          else if (task.status === 'pending') weeklyData[weekKey].pending++;
          else if (task.status === 'in_progress') weeklyData[weekKey].inProgress++;
        });

        // Calculate completion rate and convert to array
        const chartData = Object.values(weeklyData).map((week: any) => {
          const total = week.completed + week.pending + week.inProgress;
          return {
            ...week,
            completionRate: total > 0 ? Math.round((week.completed / total) * 100) : 0
          };
        });

        setData(chartData);
      } catch (error) {
        console.error('Error fetching task data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();
  }, [startDate, endDate]);

  const handleDateRangeChange = (newStartDate: Date | undefined, newEndDate: Date | undefined) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleExportCSV = () => {
    exportToCSV(data, 'task-completion-rates');
    toast.success('Chart exported to CSV');
  };

  const handleExportPDF = () => {
    exportToPDF(data, 'task-completion-rates', 'Task Completion Rates Report');
    toast.success('Chart exported to PDF');
  };

  const chartConfig = {
    completed: {
      label: "Completed",
      color: "hsl(var(--primary))",
    },
    inProgress: {
      label: "In Progress",
      color: "hsl(var(--accent))",
    },
    pending: {
      label: "Pending",
      color: "hsl(var(--muted))",
    },
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Completion Rates</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Completion Rates</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartFilters
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
        />
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="week" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="inProgress" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
