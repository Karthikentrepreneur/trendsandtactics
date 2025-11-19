import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ChartFilters } from "./ChartFilters";
import { exportToCSV, exportToPDF } from "@/utils/exportHelpers";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface TaskData {
  week: string;
  completed: number;
  pending: number;
  inProgress: number;
  completionRate: number;
  comparisonCompleted?: number;
  comparisonPending?: number;
  comparisonInProgress?: number;
}

export const TaskCompletionChart = () => {
  const [data, setData] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 56);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [comparisonStartDate, setComparisonStartDate] = useState<Date | undefined>();
  const [comparisonEndDate, setComparisonEndDate] = useState<Date | undefined>();

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
        let chartData = Object.values(weeklyData).map((week: any) => {
          const total = week.completed + week.pending + week.inProgress;
          return {
            ...week,
            completionRate: total > 0 ? Math.round((week.completed / total) * 100) : 0
          };
        });

        // Fetch comparison data if comparison mode is enabled
        if (comparisonMode && comparisonStartDate && comparisonEndDate) {
          const { data: compData, error: compError } = await supabase
            .from('tasks')
            .select('created_at, status')
            .gte('created_at', comparisonStartDate.toISOString())
            .lte('created_at', comparisonEndDate.toISOString());

          if (!compError && compData) {
            const compWeeklyData: Record<string, any> = {};
            
            compData.forEach((task) => {
              const date = new Date(task.created_at || '');
              const weekStart = new Date(date);
              weekStart.setDate(date.getDate() - date.getDay());
              const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              if (!compWeeklyData[weekKey]) {
                compWeeklyData[weekKey] = { completed: 0, pending: 0, inProgress: 0 };
              }

              if (task.status === 'completed') compWeeklyData[weekKey].completed++;
              else if (task.status === 'pending') compWeeklyData[weekKey].pending++;
              else if (task.status === 'in_progress') compWeeklyData[weekKey].inProgress++;
            });

            const compValues = Object.values(compWeeklyData);
            const avgComparison = compValues.reduce(
              (acc: any, week: any) => ({
                completed: acc.completed + week.completed,
                pending: acc.pending + week.pending,
                inProgress: acc.inProgress + week.inProgress,
              }),
              { completed: 0, pending: 0, inProgress: 0 }
            );

            const compCount = compValues.length || 1;
            chartData = chartData.map(week => ({
              ...week,
              comparisonCompleted: Math.round(avgComparison.completed / compCount),
              comparisonPending: Math.round(avgComparison.pending / compCount),
              comparisonInProgress: Math.round(avgComparison.inProgress / compCount),
            }));
          }
        }

        setData(chartData);
      } catch (error) {
        console.error('Error fetching task data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();
  }, [startDate, endDate, comparisonMode, comparisonStartDate, comparisonEndDate]);

  const handleDateRangeChange = (newStartDate: Date | undefined, newEndDate: Date | undefined) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleExportCSV = () => {
    exportToCSV(data, 'task-completion-rates', comparisonMode);
    toast.success('Chart exported to CSV');
  };

  const handleExportPDF = () => {
    exportToPDF(data, 'task-completion-rates', 'Task Completion Rates Report', comparisonMode);
    toast.success('Chart exported to PDF');
  };

  const calculateTrend = () => {
    if (!comparisonMode || data.length === 0) return null;

    const currentCompleted = data.reduce((sum, d) => sum + d.completed, 0);
    const comparisonCompleted = data.reduce((sum, d) => sum + (d.comparisonCompleted || 0), 0);

    if (comparisonCompleted === 0) return null;

    const percentChange = ((currentCompleted - comparisonCompleted) / comparisonCompleted) * 100;
    return percentChange;
  };

  const trend = calculateTrend();

  const chartConfig = {
    completed: {
      label: "Completed",
      color: "hsl(var(--primary))",
    },
    in_progress: {
      label: "In Progress",
      color: "hsl(var(--accent))",
    },
    pending: {
      label: "Pending",
      color: "hsl(var(--muted))",
    },
    cancelled: {
      label: "Cancelled",
      color: "hsl(var(--destructive))",
    },
    comparisonCompleted: {
      label: "Completed (Comparison)",
      color: "hsl(var(--primary) / 0.4)",
    },
    comparisonInProgress: {
      label: "In Progress (Comparison)",
      color: "hsl(var(--accent) / 0.4)",
    },
    comparisonPending: {
      label: "Pending (Comparison)",
      color: "hsl(var(--muted) / 0.4)",
    },
    comparisonCancelled: {
      label: "Cancelled (Comparison)",
      color: "hsl(var(--destructive) / 0.4)",
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
        <div className="flex items-center justify-between">
          <CardTitle>Task Completion Rates</CardTitle>
          {trend !== null && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">vs comparison:</span>
              <div className={`flex items-center gap-1 font-semibold ${
                trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {trend > 0 ? (
                  <ArrowUp className="h-4 w-4" />
                ) : trend < 0 ? (
                  <ArrowDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                <span>{Math.abs(trend).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartFilters
          startDate={startDate}
          endDate={endDate}
          comparisonStartDate={comparisonStartDate}
          comparisonEndDate={comparisonEndDate}
          comparisonMode={comparisonMode}
          onDateRangeChange={handleDateRangeChange}
          onComparisonDateRangeChange={(start, end) => {
            setComparisonStartDate(start);
            setComparisonEndDate(end);
          }}
          onComparisonModeChange={setComparisonMode}
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
            {comparisonMode && (
              <>
                <Bar 
                  dataKey="comparisonCompleted" 
                  fill="var(--color-comparisonCompleted)" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.5}
                />
                <Bar 
                  dataKey="comparisonInProgress" 
                  fill="var(--color-comparisonInProgress)" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.5}
                />
                <Bar 
                  dataKey="comparisonPending" 
                  fill="var(--color-comparisonPending)" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.5}
                />
              </>
            )}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
