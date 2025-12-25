import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { Schedule } from "./types.ts";

interface ScheduleContextType {
  schedulesMap: Record<string, Schedule[]>;
  setSchedulesMap: React.Dispatch<
    React.SetStateAction<Record<string, Schedule[]>>
  >;
  isLoading: boolean;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(
  undefined
);

export const useScheduleContext = () => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
};

export const ScheduleProvider = ({ children }: PropsWithChildren) => {
  const [schedulesMap, setSchedulesMap] = useState<Record<string, Schedule[]>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    import("./dummyScheduleMap.ts")
      .then((module) => {
        if (!isMounted) return;
        setSchedulesMap(module.default);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load initial schedules", error);
        if (!isMounted) return;
        setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ScheduleContext.Provider
      value={{ schedulesMap, setSchedulesMap, isLoading }}>
      {children}
    </ScheduleContext.Provider>
  );
};
