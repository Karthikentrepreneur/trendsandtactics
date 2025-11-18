import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ChartFilters } from "./ChartFilters";
import { exportToCSV, exportToPDF } from "@/utils/exportHelpers";
import { toast } from "sonner";

interface LeaveData {
  month: string;
  approved: number;
  pending: number;
  rejected: number;
  comparisonApproved?: number;
  comparisonPending?: number;
  comparisonRejected?: number;
}

export const LeaveRequestsChart = () => {
  const [data, setData] = useState<LeaveData[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [comparisonStartDate, setComparisonStartDate] = useState<Date | undefined>();
  const [comparisonEndDate, setComparisonEndDate] = useState<Date | undefined>();

  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        if (!startDate || !endDate) return;

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

        let chartData = Object.values(monthlyData);

        // Fetch comparison data if comparison mode is enabled
        if (comparisonMode && comparisonStartDate && comparisonEndDate) {
          const { data: compData, error: compError } = await supabase
            .from('leave_requests')
            .select('created_at, status')
            .gte('created_at', comparisonStartDate.toISOString())
            .lte('created_at', comparisonEndDate.toISOString())
            .order('created_at', { ascending: true });

          if (!compError && compData) {
            const compMonthlyData: Record<string, any> = {};
            
            compData.forEach((leave) => {
              const date = new Date(leave.created_at || '');
              const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

              if (!compMonthlyData[monthKey]) {
                compMonthlyData[monthKey] = { approved: 0, pending: 0, rejected: 0 };
              }

              if (leave.status === 'approved') compMonthlyData[monthKey].approved++;
              else if (leave.status === 'pending') compMonthlyData[monthKey].pending++;
              else if (leave.status === 'rejected') compMonthlyData[monthKey].rejected++;
            });

            const compValues = Object.values(compMonthlyData);
            const avgComparison = compValues.reduce(
              (acc: any, month: any) => ({
                approved: acc.approved + month.approved,
                pending: acc.pending + month.pending,
                rejected: acc.rejected + month.rejected,
              }),
              { approved: 0, pending: 0, rejected: 0 }
            );

            const compCount = compValues.length || 1;
            chartData = chartData.map((month: any) => ({
              ...month,
              comparisonApproved: Math.round(avgComparison.approved / compCount),
              comparisonPending: Math.round(avgComparison.pending / compCount),
              comparisonRejected: Math.round(avgComparison.rejected / compCount),
            }));
          }
        }

        setData(chartData);
      } catch (error) {
        console.error('Error fetching leave data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveData();
  }, [startDate, endDate, comparisonMode, comparisonStartDate, comparisonEndDate]);

  const handleDateRangeChange = (newStartDate: Date | undefined, newEndDate: Date | undefined) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleExportCSV = () => {
    exportToCSV(data, 'leave-request-statistics');
    toast.success('Chart exported to CSV');
  };

  const handleExportPDF = () => {
    exportToPDF(data, 'leave-request-statistics', 'Leave Request Statistics Report');
    toast.success('Chart exported to PDF');
  };

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
    comparisonApproved: {
      label: "Approved (Comparison)",
      color: "hsl(var(--primary) / 0.4)",
    },
    comparisonPending: {
      label: "Pending (Comparison)",
      color: "hsl(var(--accent) / 0.4)",
    },
    comparisonRejected: {
      label: "Rejected (Comparison)",
      color: "hsl(var(--destructive) / 0.4)",
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
        <CardTitle>Leave Request Statistics</CardTitle>
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
            {comparisonMode && (
              <>
                <Bar 
                  dataKey="comparisonApproved" 
                  fill="var(--color-comparisonApproved)" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.5}
                />
                <Bar 
                  dataKey="comparisonPending" 
                  fill="var(--color-comparisonPending)" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.5}
                />
                <Bar 
                  dataKey="comparisonRejected" 
                  fill="var(--color-comparisonRejected)" 
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
