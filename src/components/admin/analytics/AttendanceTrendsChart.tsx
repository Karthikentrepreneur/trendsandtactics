import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ChartFilters } from "./ChartFilters";
import { exportToCSV, exportToPDF } from "@/utils/exportHelpers";
import { toast } from "sonner";

interface AttendanceData {
  date: string;
  present: number;
  absent: number;
  halfDay: number;
}

export const AttendanceTrendsChart = () => {
  const [data, setData] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        if (!startDate || !endDate) return;

        const { data: attendanceData, error } = await supabase
          .from('attendance')
          .select('date, status')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
          .order('date', { ascending: true });

        if (error) throw error;

        // Get total employee count
        const { count: totalEmployees } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Group by date and status
        const groupedData = attendanceData?.reduce((acc: Record<string, any>, record) => {
          if (!acc[record.date]) {
            acc[record.date] = { date: record.date, present: 0, absent: 0, halfDay: 0 };
          }
          if (record.status === 'present') acc[record.date].present++;
          else if (record.status === 'absent') acc[record.date].absent++;
          else if (record.status === 'half_day') acc[record.date].halfDay++;
          return acc;
        }, {});

        // Convert to array and fill in absent counts
        const chartData = Object.values(groupedData || {}).map((day: any) => ({
          ...day,
          absent: (totalEmployees || 0) - day.present - day.halfDay,
          date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }));

        setData(chartData);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [startDate, endDate]);

  const handleDateRangeChange = (newStartDate: Date | undefined, newEndDate: Date | undefined) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleExportCSV = () => {
    exportToCSV(data, 'attendance-trends');
    toast.success('Chart exported to CSV');
  };

  const handleExportPDF = () => {
    exportToPDF(data, 'attendance-trends', 'Attendance Trends Report');
    toast.success('Chart exported to PDF');
  };

  const chartConfig = {
    present: {
      label: "Present",
      color: "hsl(var(--primary))",
    },
    halfDay: {
      label: "Half Day",
      color: "hsl(var(--accent))",
    },
    absent: {
      label: "Absent",
      color: "hsl(var(--destructive))",
    },
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Trends</CardTitle>
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
        <CardTitle>Attendance Trends</CardTitle>
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
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="present"
              stackId="1"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="halfDay"
              stackId="1"
              stroke="hsl(var(--accent))"
              fill="hsl(var(--accent))"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="absent"
              stackId="1"
              stroke="hsl(var(--destructive))"
              fill="hsl(var(--destructive))"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
