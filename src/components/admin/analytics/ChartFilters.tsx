import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ChartFiltersProps {
  onDateRangeChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  startDate?: Date;
  endDate?: Date;
}

export const ChartFilters = ({
  onDateRangeChange,
  onExportCSV,
  onExportPDF,
  startDate,
  endDate,
}: ChartFiltersProps) => {
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(startDate);
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(endDate);

  const handleStartDateChange = (date: Date | undefined) => {
    setLocalStartDate(date);
    onDateRangeChange(date, localEndDate);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setLocalEndDate(date);
    onDateRangeChange(localStartDate, date);
  };

  const setPresetRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setLocalStartDate(start);
    setLocalEndDate(end);
    onDateRangeChange(start, end);
  };

  const setQuarterRange = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    setLocalStartDate(start);
    setLocalEndDate(end);
    onDateRangeChange(start, end);
  };

  const setYearToDate = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), 0, 1);
    setLocalStartDate(start);
    setLocalEndDate(end);
    onDateRangeChange(start, end);
  };

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange(7)}
        >
          Last 7 days
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange(30)}
        >
          Last month
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={setQuarterRange}
        >
          Last quarter
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={setYearToDate}
        >
          Year to date
        </Button>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "justify-start text-left font-normal",
                !localStartDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {localStartDate ? format(localStartDate, "PPP") : "Start date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={localStartDate}
              onSelect={handleStartDateChange}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground">to</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "justify-start text-left font-normal",
                !localEndDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {localEndDate ? format(localEndDate, "PPP") : "End date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={localEndDate}
              onSelect={handleEndDateChange}
              disabled={(date) => localStartDate ? date < localStartDate : false}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {(localStartDate || localEndDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalStartDate(undefined);
              setLocalEndDate(undefined);
              onDateRangeChange(undefined, undefined);
            }}
          >
            Clear
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportCSV}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportPDF}>
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
