
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeaveRequest {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface LeaveRequestsListProps {
  requests: LeaveRequest[];
}

export const LeaveRequestsList = ({ requests }: LeaveRequestsListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Leave Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full">
          <div className="space-y-3 px-1">
            {requests.slice(0, 5).map((request) => (
              <div key={request.id} className="flex flex-col sm:flex-row justify-between p-4 border rounded-lg bg-white shadow-sm gap-3">
                <div className="space-y-2">
                  <p className="font-medium text-sm sm:text-base">{request.type}</p>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      From: {new Date(request.start_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      To: {new Date(request.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 h-fit rounded-full text-xs ${
                  request.status === 'approved' ? 'bg-green-100 text-green-800' :
                  request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {request.status}
                </span>
              </div>
            ))}
            {requests.length === 0 && (
              <p className="text-muted-foreground text-center text-sm">No leave requests found.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
