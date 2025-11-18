import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ChartFilters } from "./ChartFilters";
import { exportToCSV, exportToPDF } from "@/utils/exportHelpers";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface AttendanceData {
  date: string;
  present: number;
  absent: number;
  halfDay: number;
  comparisonPresent?: number;
  comparisonAbsent?: number;
  comparisonHalfDay?: number;
}

export const AttendanceTrendsChart = () => {
  const [data, setData] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [comparisonStartDate, setComparisonStartDate] = useState<Date | undefined>();
  const [comparisonEndDate, setComparisonEndDate] = useState<Date | undefined>();

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
        let chartData = Object.values(groupedData || {}).map((day: any) => ({
          ...day,
          absent: (totalEmployees || 0) - day.present - day.halfDay,
          date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }));

        // Fetch comparison data if comparison mode is enabled
        if (comparisonMode && comparisonStartDate && comparisonEndDate) {
          const { data: comparisonData, error: compError } = await supabase
            .from('attendance')
            .select('date, status')
            .gte('date', comparisonStartDate.toISOString().split('T')[0])
            .lte('date', comparisonEndDate.toISOString().split('T')[0])
            .order('date', { ascending: true });

          if (!compError && comparisonData) {
            const compGroupedData = comparisonData.reduce((acc: Record<string, any>, record) => {
              if (!acc[record.date]) {
                acc[record.date] = { date: record.date, present: 0, absent: 0, halfDay: 0 };
              }
              if (record.status === 'present') acc[record.date].present++;
              else if (record.status === 'absent') acc[record.date].absent++;
              else if (record.status === 'half_day') acc[record.date].halfDay++;
              return acc;
            }, {});

            const compChartData = Object.values(compGroupedData).map((day: any) => ({
              ...day,
              absent: (totalEmployees || 0) - day.present - day.halfDay,
            }));

            // Calculate averages for comparison period
            const avgComparison = compChartData.reduce(
              (acc, day: any) => ({
                present: acc.present + day.present,
                absent: acc.absent + day.absent,
                halfDay: acc.halfDay + day.halfDay,
              }),
              { present: 0, absent: 0, halfDay: 0 }
            );

            const compCount = compChartData.length || 1;
            chartData = chartData.map(day => ({
              ...day,
              comparisonPresent: Math.round(avgComparison.present / compCount),
              comparisonAbsent: Math.round(avgComparison.absent / compCount),
              comparisonHalfDay: Math.round(avgComparison.halfDay / compCount),
            }));
          }
        }

        setData(chartData);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [startDate, endDate, comparisonMode, comparisonStartDate, comparisonEndDate]);

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

  const calculateTrend = () => {
    if (!comparisonMode || data.length === 0) return null;

    const currentTotal = data.reduce((sum, d) => sum + d.present + d.halfDay + d.absent, 0);
    const comparisonTotal = data.reduce((sum, d) => 
      sum + (d.comparisonPresent || 0) + (d.comparisonHalfDay || 0) + (d.comparisonAbsent || 0), 0
    );

    if (comparisonTotal === 0) return null;

    const percentChange = ((currentTotal - comparisonTotal) / comparisonTotal) * 100;
    return percentChange;
  };

  const trend = calculateTrend();

  const chartConfig = {
    present: {
      label: "Present",
      color: "hsl(var(--primary))",
    },
    late: {
      label: "Late",
      color: "hsl(var(--accent))",
    },
    absent: {
      label: "Absent",
      color: "hsl(var(--destructive))",
    },
    comparisonPresent: {
      label: "Present (Comparison)",
      color: "hsl(var(--primary) / 0.4)",
    },
    comparisonLate: {
      label: "Late (Comparison)",
      color: "hsl(var(--accent) / 0.4)",
    },
    comparisonAbsent: {
      label: "Absent (Comparison)",
      color: "hsl(var(--destructive) / 0.4)",
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
        <div className="flex items-center justify-between">
          <CardTitle>Attendance Trends</CardTitle>
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
            {comparisonMode && (
              <>
                <Area
                  dataKey="comparisonPresent"
                  type="monotone"
                  fill="var(--color-comparisonPresent)"
                  fillOpacity={0.3}
                  stroke="var(--color-comparisonPresent)"
                  strokeDasharray="5 5"
                  stackId="2"
                />
                <Area
                  dataKey="comparisonHalfDay"
                  type="monotone"
                  fill="var(--color-comparisonHalfDay)"
                  fillOpacity={0.3}
                  stroke="var(--color-comparisonHalfDay)"
                  strokeDasharray="5 5"
                  stackId="2"
                />
                <Area
                  dataKey="comparisonAbsent"
                  type="monotone"
                  fill="var(--color-comparisonAbsent)"
                  fillOpacity={0.3}
                  stroke="var(--color-comparisonAbsent)"
                  strokeDasharray="5 5"
                  stackId="2"
                />
              </>
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
