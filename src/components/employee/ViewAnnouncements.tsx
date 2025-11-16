import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const ViewAnnouncements = () => {
  const { data: announcements = [], isLoading, error } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching announcements:', error);
        throw error;
      }
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Announcements</h2>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Announcements</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading announcements. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Announcements</h2>
      {announcements.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">No announcements found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <CardTitle>{announcement.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Posted on {new Date(announcement.created_at || '').toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewAnnouncements;