import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Text,
} from "@chakra-ui/react";
import { CellSize, DAY_LABELS, 분 } from "./constants.ts";
import { Schedule } from "./types.ts";
import { fill2, parseHnM } from "./utils.ts";
import { useDndContext, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ComponentProps, Fragment, memo, useCallback, useMemo } from "react";

interface Props {
  tableId: string;
  schedules: Schedule[];
  onScheduleTimeClick?: (timeInfo: {
    tableId: string;
    day: string;
    time: number;
  }) => void;
  onDeleteSchedule?: (tableId: string, scheduleIndex: number) => void;
}

const TIMES = [
  ...Array(18)
    .fill(0)
    .map((v, k) => v + k * 30 * 분)
    .map((v) => `${parseHnM(v)}~${parseHnM(v + 30 * 분)}`),

  ...Array(6)
    .fill(18 * 30 * 분)
    .map((v, k) => v + k * 55 * 분)
    .map((v) => `${parseHnM(v)}~${parseHnM(v + 50 * 분)}`),
] as const;

const SCHEDULE_COLORS = [
  "#fdd",
  "#ffd",
  "#dff",
  "#ddf",
  "#fdf",
  "#dfd",
] as const;

const ScheduleTableComponent = ({
  tableId,
  schedules,
  onScheduleTimeClick,
  onDeleteSchedule,
}: Props) => {
  const lectureColorMap = useMemo(() => {
    const map = new Map<string, string>();
    schedules.forEach(({ lecture }) => {
      if (!map.has(lecture.id)) {
        map.set(lecture.id, SCHEDULE_COLORS[map.size % SCHEDULE_COLORS.length]);
      }
    });
    return map;
  }, [schedules]);

  const dndContext = useDndContext();

  const getActiveTableId = () => {
    const activeId = dndContext.active?.id;
    if (activeId) {
      return String(activeId).split(":")[0];
    }
    return null;
  };

  const activeTableId = getActiveTableId();

  return (
    <Box
      position="relative"
      outline={activeTableId === tableId ? "5px dashed" : undefined}
      outlineColor="blue.300">
      <ScheduleGrid
        tableId={tableId}
        onScheduleTimeClick={onScheduleTimeClick}
      />

      {schedules.map((schedule, index) => (
        <DraggableSchedule
          key={`${schedule.lecture.id}-${index}`}
          id={`${tableId}:${index}`}
          tableId={tableId}
          scheduleIndex={index}
          data={schedule}
          bg={lectureColorMap.get(schedule.lecture.id) ?? SCHEDULE_COLORS[0]}
          onDeleteSchedule={onDeleteSchedule}
        />
      ))}
    </Box>
  );
};

const ScheduleGrid = memo(
  ({
    tableId,
    onScheduleTimeClick,
  }: {
    tableId: string;
    onScheduleTimeClick?: (timeInfo: {
      tableId: string;
      day: string;
      time: number;
    }) => void;
  }) => (
    <Grid
      templateColumns={`120px repeat(${DAY_LABELS.length}, ${CellSize.WIDTH}px)`}
      templateRows={`40px repeat(${TIMES.length}, ${CellSize.HEIGHT}px)`}
      bg="white"
      fontSize="sm"
      textAlign="center"
      outline="1px solid"
      outlineColor="gray.300">
      <GridItem key="교시" borderColor="gray.300" bg="gray.100">
        <Flex justifyContent="center" alignItems="center" h="full" w="full">
          <Text fontWeight="bold">교시</Text>
        </Flex>
      </GridItem>
      {DAY_LABELS.map((day) => (
        <GridItem
          key={day}
          borderLeft="1px"
          borderColor="gray.300"
          bg="gray.100">
          <Flex justifyContent="center" alignItems="center" h="full">
            <Text fontWeight="bold">{day}</Text>
          </Flex>
        </GridItem>
      ))}
      {TIMES.map((time, timeIndex) => (
        <Fragment key={`시간-${timeIndex + 1}`}>
          <GridItem
            borderTop="1px solid"
            borderColor="gray.300"
            bg={timeIndex > 17 ? "gray.200" : "gray.100"}>
            <Flex justifyContent="center" alignItems="center" h="full">
              <Text fontSize="xs">
                {fill2(timeIndex + 1)} ({time})
              </Text>
            </Flex>
          </GridItem>
          {DAY_LABELS.map((day) => (
            <GridItem
              key={`${day}-${timeIndex + 2}`}
              borderWidth="1px 0 0 1px"
              borderColor="gray.300"
              bg={timeIndex > 17 ? "gray.100" : "white"}
              cursor="pointer"
              _hover={{ bg: "yellow.100" }}
              onClick={() =>
                onScheduleTimeClick?.({ tableId, day, time: timeIndex + 1 })
              }
            />
          ))}
        </Fragment>
      ))}
    </Grid>
  )
);

const areRangesEqual = (a: number[], b: number[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const DraggableSchedule = memo(
  ({
    id,
    tableId,
    scheduleIndex,
    data,
    bg,
    onDeleteSchedule,
    ...rest
  }: {
    id: string;
    tableId: string;
    scheduleIndex: number;
    data: Schedule;
    onDeleteSchedule?: (tableId: string, scheduleIndex: number) => void;
  } & ComponentProps<typeof Box>) => {
    const { day, range, room, lecture } = data;
    const { attributes, setNodeRef, listeners, transform } = useDraggable({
      id,
    });
    const leftIndex = DAY_LABELS.indexOf(day as (typeof DAY_LABELS)[number]);
    const topIndex = range[0] - 1;
    const size = range.length;

    const handleDelete = useCallback(() => {
      onDeleteSchedule?.(tableId, scheduleIndex);
    }, [onDeleteSchedule, tableId, scheduleIndex]);

    return (
      <Popover>
        <PopoverTrigger>
          <Box
            position="absolute"
            left={`${120 + CellSize.WIDTH * leftIndex + 1}px`}
            top={`${40 + (topIndex * CellSize.HEIGHT + 1)}px`}
            width={CellSize.WIDTH - 1 + "px"}
            height={CellSize.HEIGHT * size - 1 + "px"}
            bg={bg}
            p={1}
            boxSizing="border-box"
            cursor="pointer"
            ref={setNodeRef}
            transform={CSS.Translate.toString(transform)}
            {...listeners}
            {...attributes}
            {...rest}>
            <Text fontSize="sm" fontWeight="bold">
              {lecture.title}
            </Text>
            <Text fontSize="xs">{room}</Text>
          </Box>
        </PopoverTrigger>
        <PopoverContent onClick={(event) => event.stopPropagation()}>
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverBody>
            <Text>강의를 삭제하시겠습니까?</Text>
            <Button colorScheme="red" size="xs" onClick={handleDelete}>
              삭제
            </Button>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    );
  },
  (prev, next) => {
    return (
      prev.id === next.id &&
      prev.tableId === next.tableId &&
      prev.scheduleIndex === next.scheduleIndex &&
      prev.bg === next.bg &&
      prev.data.day === next.data.day &&
      prev.data.room === next.data.room &&
      prev.data.lecture.id === next.data.lecture.id &&
      prev.data.lecture.title === next.data.lecture.title &&
      areRangesEqual(prev.data.range, next.data.range) &&
      prev.onDeleteSchedule === next.onDeleteSchedule
    );
  }
);

export default memo(ScheduleTableComponent);
