import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  date_time: string;
  location: string;
  description: string;
  hours_value: number;
}

interface Attendance {
  id: string;
  event_id: string;
  status: 'pending' | 'approved' | 'denied';
  hours_awarded: number;
  events: Event;
}

const MemberDashboard = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [myAttendance, setMyAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch upcoming events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true });

      // Fetch my attendance records
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select(`
          *,
          events (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setEvents(eventsData || []);
      setMyAttendance(attendanceData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUpForEvent = async (eventId: string, hoursValue: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('attendance')
        .insert({
          event_id: eventId,
          user_id: user.id,
          hours_awarded: hoursValue,
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "You've successfully signed up for this event.",
      });

      fetchData(); // Refresh data
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to sign up for event",
      });
    }
  };

  const isSignedUp = (eventId: string) => {
    return myAttendance.some(a => a.event_id === eventId);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      denied: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome, {profile?.name}!</h1>
        <p className="text-muted-foreground">Track your community service hours and join events</p>
      </div>

      {/* Total Hours Card */}
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Total Hours</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-6xl font-bold text-primary mb-2">
            {profile?.total_hours || 0}
          </div>
          <p className="text-muted-foreground">Community Service Hours</p>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Upcoming Events</h2>
        {events.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No upcoming events at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {event.hours_value} hours credit
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4" />
                    {format(new Date(event.date_time), 'PPP p')}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  <Button
                    onClick={() => signUpForEvent(event.id, event.hours_value)}
                    disabled={isSignedUp(event.id)}
                    className="w-full"
                  >
                    {isSignedUp(event.id) ? 'Already Signed Up' : 'Sign Up'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* My Attendance */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">My Attendance</h2>
        {myAttendance.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No attendance records yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myAttendance.map((attendance) => (
              <Card key={attendance.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{attendance.events.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(attendance.events.date_time), 'PPP')}
                    </p>
                    <p className="text-sm">
                      Hours: {attendance.hours_awarded}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(attendance.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberDashboard;