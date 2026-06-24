import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from "react";

import API_BASE_URL from "../config/api";

const LiveClassContext = createContext();

export const useLiveClass = () => {
  return useContext(LiveClassContext);
};

export const LiveClassProvider = ({ children }) => {

  const [liveClasses, setLiveClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [currentClass, setCurrentClass] = useState(null);
  const [endedClasses, setEndedClasses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('endedClasses') || '[]');
    } catch { return []; }
  });

  // ── Employee: get employeeId (employee) ──
  const getEmployeeId = () => {
    try {
      const user = localStorage.getItem("user");
      if (user) {
        const parsed = JSON.parse(user);
        return parsed._id || parsed.id;
      }
      return null;
    } catch {
      return null;
    }
  };

  // // ── Fetch participant enrollments ──
  // const fetchEnrollments = async (participantId) => {
  //   if (!participantId) return [];
  //   try {
  //     const res = await fetch(`${API_BASE_URL}/api/employee/${participantId}/enrollments`);
  //     const data = await res.json();
  //     return data.enrolledSubjects || [];
  //   } catch (err) {
  //     console.error("Error fetching enrollments:", err);
  //     return [];
  //   }
  // };

  // ── Fetch all active schedules from MongoDB ──
  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/schedules`);
      const data = await res.json();
      setSchedules(data || []);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    }
  };

  // ── Filter schedules by enrolled courseCodes ──
  const getFilteredSchedules = async () => {
    const employeeId = getEmployeeId();

    if (!employeeId) return [];

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/schedules/employee/${employeeId}`
      );

      const data = await res.json();

      if (!res.ok) {
        return {
          schedules: [],
          message: data.message
        };
      }

      return data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };
  // ================= FETCH CLASSES
  const fetchLiveClasses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/liveclasses`);
      const data = await res.json();
      setLiveClasses(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLiveClasses();
    fetchSchedules();
    const interval = setInterval(() => {
      fetchLiveClasses();
      fetchSchedules();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ================= START CLASS
  const startLiveClass = async (classData) => {
    const res = await fetch(`${API_BASE_URL}/api/liveclasses/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(classData)
    });

    const data = await res.json();

    if (data.success) {
      setCurrentClass(data.liveClass);
      fetchLiveClasses();
    }
  };

  // ================= END CLASS
  const endLiveClass = async (classId) => {
    try {
      // Find the class before ending it
      const cls = liveClasses.find(c => c.id === classId);

      await fetch(`${API_BASE_URL}/api/liveclasses/end/${classId}`, {
        method: "DELETE"
      });

      // ✅ Save to endedClasses so employees see "missed" message
      if (cls) {
        const ended = {
          ...cls,
          isLive: false,
          endedAt: new Date().toISOString()
        };
        setEndedClasses(prev => {
          const updated = [ended, ...prev].slice(0, 20); // keep last 20
          localStorage.setItem('endedClasses', JSON.stringify(updated));
          return updated;
        });
      }

      fetchLiveClasses();
      if (currentClass?.id === classId) setCurrentClass(null);
    } catch (err) {
      console.error('Error ending class:', err);
    }
  };

  // ================= JOIN CLASS
  const joinClass = (liveClass) => {
    setCurrentClass(liveClass);
  };

  // ================= LEAVE
  const leaveClass = () => {
    setCurrentClass(null);
  };

  return (
    <LiveClassContext.Provider
      value={{
        liveClasses,
        schedules,
        currentClass,
        endedClasses,
        startLiveClass,
        endLiveClass,
        joinClass,
        leaveClass,
        fetchLiveClasses,
        fetchSchedules,
        // fetchEnrollments,
        getFilteredSchedules
      }}
    >
      {children}
    </LiveClassContext.Provider>
  );
};