import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface LeaveData {
  month: string;
  approved: number;
  pending: number;
  rejected: number;
}

export const LeaveRequestsChart = () => {
  const [data, setData] = useState<LeaveData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        // Get leave requests from last 6 months
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);

        const { data: leaveData, error } = await supabase
          .from('leave_requests')
          .select('created_at, status')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by month
        const monthlyData: Record<string, any> = {};
        
        leaveData?.forEach((leave) => {
          const date = new Date(leave.created_at || '');
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: monthKey, approved: 0, pending: 0, rejected: 0 };
          }

          if (leave.status === 'approved') monthlyData[monthKey].approved++;
          else if (leave.status === 'pending') monthlyData[monthKey].pending++;
          else if (leave.status === 'rejected') monthlyData[monthKey].rejected++;
        });

        const chartData = Object.values(monthlyData);
        setData(chartData);
      } catch (error) {
        console.error('Error fetching leave data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveData();
  }, []);

  const chartConfig = {
    approved: {
      label: "Approved",
      color: "hsl(var(--primary))",
    },
    pending: {
      label: "Pending",
      color: "hsl(var(--accent))",
    },
    rejected: {
      label: "Rejected",
      color: "hsl(var(--destructive))",
    },
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Request Statistics</CardTitle>
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
        <CardTitle>Leave Request Statistics (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="approved" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="rejected" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
