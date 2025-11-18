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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ChartFiltersProps {
  onDateRangeChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
  onComparisonDateRangeChange?: (startDate: Date | undefined, endDate: Date | undefined) => void;
  onComparisonModeChange?: (enabled: boolean) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  startDate?: Date;
  endDate?: Date;
  comparisonStartDate?: Date;
  comparisonEndDate?: Date;
  comparisonMode?: boolean;
}

export const ChartFilters = ({
  onDateRangeChange,
  onComparisonDateRangeChange,
  onComparisonModeChange,
  onExportCSV,
  onExportPDF,
  startDate,
  endDate,
  comparisonStartDate,
  comparisonEndDate,
  comparisonMode = false,
}: ChartFiltersProps) => {
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(startDate);
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(endDate);
  const [localComparisonStartDate, setLocalComparisonStartDate] = useState<Date | undefined>(comparisonStartDate);
  const [localComparisonEndDate, setLocalComparisonEndDate] = useState<Date | undefined>(comparisonEndDate);
  const [localComparisonMode, setLocalComparisonMode] = useState(comparisonMode);

  const handleStartDateChange = (date: Date | undefined) => {
    setLocalStartDate(date);
    onDateRangeChange(date, localEndDate);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setLocalEndDate(date);
    onDateRangeChange(localStartDate, date);
  };

  const handleComparisonStartDateChange = (date: Date | undefined) => {
    setLocalComparisonStartDate(date);
    onComparisonDateRangeChange?.(date, localComparisonEndDate);
  };

  const handleComparisonEndDateChange = (date: Date | undefined) => {
    setLocalComparisonEndDate(date);
    onComparisonDateRangeChange?.(localComparisonStartDate, date);
  };

  const handleComparisonModeToggle = (checked: boolean) => {
    setLocalComparisonMode(checked);
    onComparisonModeChange?.(checked);
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
      <div className="flex items-center gap-2">
        <Switch
          id="comparison-mode"
          checked={localComparisonMode}
          onCheckedChange={handleComparisonModeToggle}
        />
        <Label htmlFor="comparison-mode" className="text-sm font-medium cursor-pointer">
          Compare with another period
        </Label>
      </div>

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
      </div>

      {localComparisonMode && (
        <div className="flex flex-wrap items-center gap-2 pl-4 border-l-2 border-muted">
          <span className="text-sm text-muted-foreground font-medium">Comparison period:</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !localComparisonStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localComparisonStartDate ? format(localComparisonStartDate, "PPP") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={localComparisonStartDate}
                onSelect={handleComparisonStartDateChange}
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
                  !localComparisonEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localComparisonEndDate ? format(localComparisonEndDate, "PPP") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={localComparisonEndDate}
                onSelect={handleComparisonEndDateChange}
                disabled={(date) => localComparisonStartDate ? date < localComparisonStartDate : false}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {(localComparisonStartDate || localComparisonEndDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocalComparisonStartDate(undefined);
                setLocalComparisonEndDate(undefined);
                onComparisonDateRangeChange?.(undefined, undefined);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
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
