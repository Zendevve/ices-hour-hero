import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Clock, Users, CheckCircle, XCircle } from 'lucide-react';
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
  user_id: string;
  status: 'pending' | 'approved' | 'denied';
  hours_awarded: number;
  profiles: {
    name: string;
    email: string;
  };
}

const OfficerDashboard = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingAttendance, setPendingAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch all events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('date_time', { ascending: false });

      // Fetch pending attendance records
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      // Fetch profiles for users with pending attendance
      let attendanceWithProfiles: Attendance[] = [];
      if (attendanceData && attendanceData.length > 0) {
        const userIds = attendanceData.map(a => a.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .in('user_id', userIds);

        // Combine attendance with profile data
        attendanceWithProfiles = attendanceData.map(attendance => ({
          ...attendance,
          profiles: profilesData?.find(p => p.user_id === attendance.user_id) || { name: 'Unknown', email: '' }
        }));
      }

      setEvents(eventsData || []);
      setPendingAttendance(attendanceWithProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAttendanceStatus = async (attendanceId: string, status: 'approved' | 'denied') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('attendance')
        .update({
          status,
          verified_by: user.id,
        })
        .eq('id', attendanceId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Attendance ${status} successfully.`,
      });

      fetchData(); // Refresh data
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update attendance",
      });
    }
  };

  const getEventById = (eventId: string) => {
    return events.find(e => e.id === eventId);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Officer Panel</h1>
        <p className="text-muted-foreground">Manage event attendance and verify community service hours</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingAttendance.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{profile?.role}</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Verification */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Attendance Verification</h2>
        {pendingAttendance.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No pending attendance records to review.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingAttendance.map((attendance) => {
              const event = getEventById(attendance.event_id);
              return (
                <Card key={attendance.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">
                          {event?.title || 'Unknown Event'}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {attendance.profiles.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {event && format(new Date(event.date_time), 'PPP')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {attendance.hours_awarded} hours
                          </span>
                        </div>
                        {event?.location && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateAttendanceStatus(attendance.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateAttendanceStatus(attendance.id, 'denied')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Recent Events</h2>
        {events.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No events found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.slice(0, 6).map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {event.hours_value} hours credit
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficerDashboard;