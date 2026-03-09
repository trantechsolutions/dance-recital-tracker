import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useLiveTracker(orgId, selectedShowId) {
  const [recitalData, setRecitalData] = useState(null);
  const [currentAct, setCurrentAct] = useState({ number: null, title: '', isTracking: false });
  const [loading, setLoading] = useState(true);

  // --- Helper: Fetch all shows + acts for an org and build the recitalData shape ---
  const fetchProgramData = useCallback(async () => {
    if (!orgId) {
      setRecitalData(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch all shows for this org
      const { data: shows, error: showsErr } = await supabase
        .from('shows')
        .select('id, label')
        .eq('org_id', orgId);

      if (showsErr) throw showsErr;

      if (!shows || shows.length === 0) {
        setRecitalData({});
        setLoading(false);
        return;
      }

      // Fetch all acts for these shows
      const showIds = shows.map(s => s.id);
      const { data: acts, error: actsErr } = await supabase
        .from('acts')
        .select('show_id, number, title, performers')
        .in('show_id', showIds)
        .order('number', { ascending: true });

      if (actsErr) throw actsErr;

      // Build the same shape as the old Firebase data
      const data = {};
      shows.forEach(show => {
        data[show.id] = {
          id: show.id,
          label: show.label,
          acts: (acts || [])
            .filter(a => a.show_id === show.id)
            .map(a => ({
              number: a.number,
              title: a.title,
              performers: a.performers || []
            }))
        };
      });

      console.log(`Program Data Loaded for Org [${orgId}]:`, Object.keys(data));
      setRecitalData(data);
    } catch (err) {
      console.error("Supabase Program Error:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // 1. Initial data fetch + realtime subscription for shows & acts
  useEffect(() => {
    if (!orgId) {
      setRecitalData(null);
      setLoading(false);
      return;
    }

    fetchProgramData();

    // Subscribe to realtime changes on shows for this org
    const showsChannel = supabase
      .channel(`shows-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shows', filter: `org_id=eq.${orgId}` },
        () => {
          // Re-fetch all program data when any show changes
          fetchProgramData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'acts' },
        (payload) => {
          // Re-fetch when acts change (we filter client-side since acts don't have org_id)
          fetchProgramData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(showsChannel);
    };
  }, [orgId, fetchProgramData]);

  // 2. Listen for "Now Performing" status for the specific show
  useEffect(() => {
    if (!orgId || !selectedShowId || !recitalData || !recitalData[selectedShowId]) {
      setCurrentAct({ number: null, title: '', isTracking: false });
      return;
    }

    // Initial fetch of status
    const fetchStatus = async () => {
      const { data: statusData } = await supabase
        .from('show_status')
        .select('current_act_number, is_tracking')
        .eq('show_id', selectedShowId)
        .single();

      if (!statusData) {
        setCurrentAct({ number: 1, title: 'Not Started', isTracking: false });
        return;
      }

      const acts = recitalData[selectedShowId]?.acts || [];
      const act = acts.find(a => a.number === statusData.current_act_number);

      setCurrentAct({
        number: statusData.current_act_number,
        title: act ? act.title : 'Act not found',
        isTracking: statusData.is_tracking || false
      });
    };

    fetchStatus();

    // Subscribe to realtime status changes
    const statusChannel = supabase
      .channel(`status-${selectedShowId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'show_status', filter: `show_id=eq.${selectedShowId}` },
        (payload) => {
          const statusData = payload.new;
          if (!statusData) return;

          const acts = recitalData[selectedShowId]?.acts || [];
          const act = acts.find(a => a.number === statusData.current_act_number);

          setCurrentAct({
            number: statusData.current_act_number,
            title: act ? act.title : 'Act not found',
            isTracking: statusData.is_tracking || false
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [orgId, selectedShowId, recitalData]);

  // --- Persistence Actions ---
  const updateActNumber = async (num) => {
    if (!orgId || !selectedShowId) return;

    await supabase
      .from('show_status')
      .upsert({
        show_id: selectedShowId,
        org_id: orgId,
        current_act_number: num,
        is_tracking: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'show_id' });
  };

  const toggleTracking = async () => {
    if (!orgId || !selectedShowId) return;

    await supabase
      .from('show_status')
      .upsert({
        show_id: selectedShowId,
        org_id: orgId,
        is_tracking: !currentAct.isTracking,
        updated_at: new Date().toISOString()
      }, { onConflict: 'show_id' });
  };

  return {
    recitalData,
    currentAct,
    loading,
    setRecitalData,
    updateActNumber,
    toggleTracking
  };
}