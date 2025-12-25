import {
  DndContext,
  Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { PropsWithChildren, createContext, useContext, useState } from "react";
import { CellSize, DAY_LABELS } from "./constants.ts";
import { useScheduleContext } from "./ScheduleContext.tsx";

const areRangesEqual = (a: number[], b: number[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

function createSnapModifier(): Modifier {
  return ({ transform, containerNodeRect, draggingNodeRect }) => {
    const containerTop = containerNodeRect?.top ?? 0;
    const containerLeft = containerNodeRect?.left ?? 0;
    const containerBottom = containerNodeRect?.bottom ?? 0;
    const containerRight = containerNodeRect?.right ?? 0;

    const { top = 0, left = 0, bottom = 0, right = 0 } = draggingNodeRect ?? {};

    const minX = containerLeft - left + 120 + 1;
    const minY = containerTop - top + 40 + 1;
    const maxX = containerRight - right;
    const maxY = containerBottom - bottom;

    return {
      ...transform,
      x: Math.min(
        Math.max(
          Math.round(transform.x / CellSize.WIDTH) * CellSize.WIDTH,
          minX
        ),
        maxX
      ),
      y: Math.min(
        Math.max(
          Math.round(transform.y / CellSize.HEIGHT) * CellSize.HEIGHT,
          minY
        ),
        maxY
      ),
    };
  };
}

const modifiers = [createSnapModifier()];

const ActiveTableContext = createContext<string | null>(null);

export const useActiveTableId = () => useContext(ActiveTableContext);

interface ProviderProps extends PropsWithChildren {
  tableId?: string;
}

export default function ScheduleDndProvider({
  children,
  tableId,
}: ProviderProps) {
  const { setSchedulesMap } = useScheduleContext();
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragStart = (event: any) => {
    if (tableId) {
      setActiveTableId(tableId);
      return;
    }

    const activeId = event.active?.id;
    if (activeId) {
      setActiveTableId(String(activeId).split(":")[0]);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = (event: any) => {
    setActiveTableId(null);
    const { active, delta } = event;
    const { x, y } = delta;
    const [tableId, index] = active.id.split(":");
    const moveDayIndex = Math.floor(x / 80);
    const moveTimeIndex = Math.floor(y / 30);

    if (moveDayIndex === 0 && moveTimeIndex === 0) {
      return;
    }

    setSchedulesMap((prev) => {
      const schedules = prev[tableId];
      if (!schedules) return prev;

      const scheduleIndex = Number(index);
      const schedule = schedules[scheduleIndex];
      if (!schedule) return prev;

      const nowDayIndex = DAY_LABELS.indexOf(
        schedule.day as (typeof DAY_LABELS)[number]
      );

      const nextDayIndex = nowDayIndex + moveDayIndex;
      if (nextDayIndex < 0 || nextDayIndex >= DAY_LABELS.length) {
        return prev;
      }

      const updatedDay = DAY_LABELS[nextDayIndex];
      const updatedRange = schedule.range.map((time) => time + moveTimeIndex);

      if (
        updatedRange.some((time) => time < 1) ||
        (areRangesEqual(schedule.range, updatedRange) &&
          schedule.day === updatedDay)
      ) {
        return prev;
      }

      const nextSchedules = [...schedules];
      nextSchedules[scheduleIndex] = {
        ...schedule,
        day: updatedDay,
        range: updatedRange,
      };

      return {
        ...prev,
        [tableId]: nextSchedules,
      };
    });
  };

  return (
    <ActiveTableContext.Provider value={activeTableId}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={modifiers}>
        {children}
      </DndContext>
    </ActiveTableContext.Provider>
  );
}
