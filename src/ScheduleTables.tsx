import {
  Button,
  ButtonGroup,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import ScheduleTable from "./ScheduleTable.tsx";
import { useScheduleContext } from "./ScheduleContext.tsx";
import { Suspense, lazy, memo, useCallback, useMemo, useState } from "react";
import ScheduleDndProvider, {
  useActiveTableId,
} from "./ScheduleDndProvider.tsx";
import { Schedule } from "./types.ts";

const SearchDialog = lazy(() => import("./SearchDialog"));

export const ScheduleTables = () => <ScheduleTablesContent />;

const ScheduleTablesContent = () => {
  const { schedulesMap, setSchedulesMap, isLoading } = useScheduleContext();
  const [searchInfo, setSearchInfo] = useState<{
    tableId: string;
    day?: string;
    time?: number;
  } | null>(null);

  const disabledRemoveButton = Object.keys(schedulesMap).length === 1;

  const tableEntries = useMemo(
    () => Object.entries(schedulesMap),
    [schedulesMap]
  );

  const duplicate = useCallback(
    (targetId: string) => {
      setSchedulesMap((prev) => ({
        ...prev,
        [`schedule-${Date.now()}`]: [...prev[targetId]],
      }));
    },
    [setSchedulesMap]
  );

  const remove = useCallback(
    (targetId: string) => {
      setSchedulesMap((prev) => {
        delete prev[targetId];
        return { ...prev };
      });
    },
    [setSchedulesMap]
  );

  const closeSearchDialog = useCallback(() => {
    setSearchInfo(null);
  }, []);

  const handleScheduleTimeClick = useCallback(
    ({
      tableId,
      day,
      time,
    }: {
      tableId: string;
      day: string;
      time: number;
    }) => {
      setSearchInfo({ tableId, day, time });
    },
    []
  );

  const handleDeleteSchedule = useCallback(
    (tableId: string, scheduleIndex: number) => {
      setSchedulesMap((prev) => ({
        ...prev,
        [tableId]: prev[tableId].filter((_, idx) => idx !== scheduleIndex),
      }));
    },
    [setSchedulesMap]
  );

  const openSearchDialog = useCallback(
    (tableId: string) => {
      setSearchInfo({ tableId });
    },
    [setSearchInfo]
  );

  if (isLoading) {
    return (
      <Flex w="full" h="50vh" justifyContent="center" alignItems="center">
        <Spinner size="lg" color="green.500" mr={3} />
        <Text color="gray.600">시간표 데이터를 불러오는 중...</Text>
      </Flex>
    );
  }

  return (
    <>
      <Flex w="full" gap={6} p={6} flexWrap="wrap">
        {tableEntries.map(([tableId, schedules], index) => (
          <ScheduleTableSection
            key={tableId}
            tableId={tableId}
            index={index}
            schedules={schedules}
            disabledRemoveButton={disabledRemoveButton}
            onOpenSearchDialog={openSearchDialog}
            onDuplicate={duplicate}
            onRemove={remove}
            onScheduleTimeClick={handleScheduleTimeClick}
            onDeleteSchedule={handleDeleteSchedule}
          />
        ))}
      </Flex>
      {searchInfo && (
        <Suspense
          fallback={
            <Flex justifyContent="center" py={10}>
              <Text color="gray.500">검색 창을 불러오는 중...</Text>
            </Flex>
          }>
          <SearchDialog searchInfo={searchInfo} onClose={closeSearchDialog} />
        </Suspense>
      )}
    </>
  );
};

interface ScheduleTableSectionProps {
  tableId: string;
  index: number;
  schedules: Schedule[];
  disabledRemoveButton: boolean;
  onOpenSearchDialog: (tableId: string) => void;
  onDuplicate: (targetId: string) => void;
  onRemove: (targetId: string) => void;
  onScheduleTimeClick: (timeInfo: {
    tableId: string;
    day: string;
    time: number;
  }) => void;
  onDeleteSchedule: (tableId: string, scheduleIndex: number) => void;
}
type ScheduleTableSectionContentProps = Omit<
  ScheduleTableSectionProps,
  "onOpenSearchDialog" | "onDuplicate" | "onRemove"
> & {
  onOpenSearchDialog: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

const ScheduleTableSection = memo((props: ScheduleTableSectionProps) => {
  const { tableId, onOpenSearchDialog, onDuplicate, onRemove } = props;

  const handleOpenSearchDialog = useCallback(() => {
    onOpenSearchDialog(tableId);
  }, [onOpenSearchDialog, tableId]);

  const handleDuplicate = useCallback(() => {
    onDuplicate(tableId);
  }, [onDuplicate, tableId]);

  const handleRemove = useCallback(() => {
    onRemove(tableId);
  }, [onRemove, tableId]);

  return (
    <ScheduleDndProvider tableId={tableId}>
      <ScheduleTableSectionContent
        {...props}
        onOpenSearchDialog={handleOpenSearchDialog}
        onDuplicate={handleDuplicate}
        onRemove={handleRemove}
      />
    </ScheduleDndProvider>
  );
});

const ScheduleTableSectionContent = ({
  tableId,
  index,
  schedules,
  disabledRemoveButton,
  onOpenSearchDialog,
  onDuplicate,
  onRemove,
  onScheduleTimeClick,
  onDeleteSchedule,
}: ScheduleTableSectionContentProps) => {
  const activeTableId = useActiveTableId();
  const isActive = activeTableId === tableId;

  return (
    <Stack width="600px">
      <Flex justifyContent="space-between" alignItems="center">
        <Heading as="h3" fontSize="lg">
          시간표 {index + 1}
        </Heading>
        <ButtonGroup size="sm" isAttached>
          <Button colorScheme="green" onClick={onOpenSearchDialog}>
            시간표 추가
          </Button>
          <Button colorScheme="green" mx="1px" onClick={onDuplicate}>
            복제
          </Button>
          <Button
            colorScheme="green"
            isDisabled={disabledRemoveButton}
            onClick={onRemove}>
            삭제
          </Button>
        </ButtonGroup>
      </Flex>
      <ScheduleTable
        schedules={schedules}
        tableId={tableId}
        isActive={isActive}
        onScheduleTimeClick={onScheduleTimeClick}
        onDeleteSchedule={onDeleteSchedule}
      />
    </Stack>
  );
};
