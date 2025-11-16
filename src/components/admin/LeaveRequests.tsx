import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const LeaveRequests = () => {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const { data, error} = await supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:user_id (
            name,
            employee_id,
            designation,
            email
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log('Leave requests with profiles:', data);
      return data;
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleStatusUpdate = async (id: string, newStatus: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Leave request ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update leave request status');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800"
    };
    return <Badge className={styles[status as keyof typeof styles]}>{status}</Badge>;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Leave Requests</h2>
      <Card>
        <CardHeader>
          <CardTitle>All Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-muted-foreground">No leave requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Employee</TableHead>
                    <TableHead className="whitespace-nowrap">Type</TableHead>
                    <TableHead className="whitespace-nowrap">Start Date</TableHead>
                    <TableHead className="whitespace-nowrap">End Date</TableHead>
                    <TableHead className="whitespace-nowrap">Reason</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="whitespace-nowrap">
                        {request.profiles?.name || 'Unknown'}
                        {request.profiles?.designation && (
                          <span className="block text-sm text-gray-500">
                            {request.profiles.designation}
                          </span>
                        )}
                        {request.profiles?.email && (
                          <span className="block text-sm text-gray-500">
                            {request.profiles.email}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{request.leave_type}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(request.start_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(request.end_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{request.reason}</TableCell>
                      <TableCell className="whitespace-nowrap">{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="space-x-2 whitespace-nowrap">
                        {request.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleStatusUpdate(request.id, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusUpdate(request.id, "rejected")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveRequests;