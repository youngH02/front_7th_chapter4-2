import { Button, ButtonGroup, Flex, Heading, Stack } from "@chakra-ui/react";
import ScheduleTable from "./ScheduleTable.tsx";
import { useScheduleContext } from "./ScheduleContext.tsx";
import SearchDialog from "./SearchDialog.tsx";
import { useCallback, useMemo, useState } from "react";
import ScheduleDndProvider from "./ScheduleDndProvider.tsx";

export const ScheduleTables = () => {
  const { schedulesMap, setSchedulesMap } = useScheduleContext();
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

  return (
    <>
      <Flex w="full" gap={6} p={6} flexWrap="wrap">
        {tableEntries.map(([tableId, schedules], index) => (
          <Stack key={tableId} width="600px">
            <Flex justifyContent="space-between" alignItems="center">
              <Heading as="h3" fontSize="lg">
                시간표 {index + 1}
              </Heading>
              <ButtonGroup size="sm" isAttached>
                <Button
                  colorScheme="green"
                  onClick={() => setSearchInfo({ tableId })}>
                  시간표 추가
                </Button>
                <Button
                  colorScheme="green"
                  mx="1px"
                  onClick={() => duplicate(tableId)}>
                  복제
                </Button>
                <Button
                  colorScheme="green"
                  isDisabled={disabledRemoveButton}
                  onClick={() => remove(tableId)}>
                  삭제
                </Button>
              </ButtonGroup>
            </Flex>
            <ScheduleDndProvider>
              <ScheduleTable
                schedules={schedules}
                tableId={tableId}
                onScheduleTimeClick={handleScheduleTimeClick}
                onDeleteSchedule={handleDeleteSchedule}
              />
            </ScheduleDndProvider>
          </Stack>
        ))}
      </Flex>
      {searchInfo && (
        <SearchDialog searchInfo={searchInfo} onClose={closeSearchDialog} />
      )}
    </>
  );
};
