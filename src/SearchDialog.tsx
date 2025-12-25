import {
  memo,
  RefObject,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { useScheduleContext } from "./ScheduleContext.tsx";
import { Lecture } from "./types.ts";
import { parseSchedule } from "./utils.ts";
import axios from "axios";
import { DAY_LABELS } from "./constants.ts";
import { useAutoCallback } from "./useAutoCallback.ts";
import { createCachedFetch } from "./cache.ts";
import { List, ListImperativeAPI, RowComponentProps } from "react-window";

interface Props {
  searchInfo: {
    tableId: string;
    day?: string;
    time?: number;
  } | null;
  onClose: () => void;
}

interface SearchOption {
  query?: string;
  grades: number[];
  days: string[];
  times: number[];
  majors: string[];
  credits?: string;
}

const TIME_SLOTS = [
  { id: 1, label: "09:00~09:30" },
  { id: 2, label: "09:30~10:00" },
  { id: 3, label: "10:00~10:30" },
  { id: 4, label: "10:30~11:00" },
  { id: 5, label: "11:00~11:30" },
  { id: 6, label: "11:30~12:00" },
  { id: 7, label: "12:00~12:30" },
  { id: 8, label: "12:30~13:00" },
  { id: 9, label: "13:00~13:30" },
  { id: 10, label: "13:30~14:00" },
  { id: 11, label: "14:00~14:30" },
  { id: 12, label: "14:30~15:00" },
  { id: 13, label: "15:00~15:30" },
  { id: 14, label: "15:30~16:00" },
  { id: 15, label: "16:00~16:30" },
  { id: 16, label: "16:30~17:00" },
  { id: 17, label: "17:00~17:30" },
  { id: 18, label: "17:30~18:00" },
  { id: 19, label: "18:00~18:50" },
  { id: 20, label: "18:55~19:45" },
  { id: 21, label: "19:50~20:40" },
  { id: 22, label: "20:45~21:35" },
  { id: 23, label: "21:40~22:30" },
  { id: 24, label: "22:35~23:25" },
];

const VIRTUAL_LIST_HEIGHT = 500;
const ROW_HEIGHT = 60;
const COLUMN_TEMPLATE = "120px 60px 220px 60px 180px 220px 80px";

const fetchMajors = createCachedFetch(() =>
  axios.get<Lecture[]>("/schedules-majors.json")
);
const fetchLiberalArts = createCachedFetch(() =>
  axios.get<Lecture[]>("/schedules-liberal-arts.json")
);

// TODO: 이 코드를 개선해서 API 호출을 최소화 해보세요 + Promise.all이 현재 잘못 사용되고 있습니다. 같이 개선해주세요.
const fetchAllLectures = async () => {
  const [majors, liberalArts] = await Promise.all([
    fetchMajors(),
    fetchLiberalArts(),
  ]);
  return [majors, liberalArts];
};

interface LectureRowData {
  lectures: Lecture[];
  addSchedule: (lecture: Lecture) => void;
}

type LectureRowProps = RowComponentProps<LectureRowData>;

const VirtualizedLectureRow = ({
  index,
  style,
  lectures,
  addSchedule,
  ariaAttributes,
}: LectureRowProps) => {
  const lecture = lectures[index];
  if (!lecture) {
    return <Box style={style} {...ariaAttributes} />;
  }

  const handleClick = () => addSchedule(lecture);
  const isStriped = index % 2 === 0;

  return (
    <Box
      key={lecture.id}
      style={style}
      px={2}
      py={2}
      bg={isStriped ? "gray.50" : "white"}
      borderBottom="1px solid"
      borderColor="gray.100"
      {...ariaAttributes}>
      <Grid
        templateColumns={COLUMN_TEMPLATE}
        alignItems="center"
        gap={2}
        fontSize="sm">
        <Text>{lecture.id}</Text>
        <Text>{lecture.grade}</Text>
        <Text noOfLines={1}>{lecture.title}</Text>
        <Text>{lecture.credits}</Text>
        <Box
          fontSize="sm"
          dangerouslySetInnerHTML={{ __html: lecture.major }}
        />
        <Box
          fontSize="sm"
          dangerouslySetInnerHTML={{ __html: lecture.schedule }}
        />
        <Button size="sm" colorScheme="green" onClick={handleClick}>
          추가
        </Button>
      </Grid>
    </Box>
  );
};
interface QueryCreditFiltersProps {
  query: string;
  credits?: SearchOption["credits"];
  onQueryChange: (value: string) => void;
  onCreditsChange: (value: string) => void;
}

const QueryCreditFilters = memo(
  ({
    query,
    credits,
    onQueryChange,
    onCreditsChange,
  }: QueryCreditFiltersProps) => (
    <HStack spacing={4}>
      <FormControl>
        <FormLabel>검색어</FormLabel>
        <Input
          placeholder="과목명 또는 과목코드"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </FormControl>

      <FormControl>
        <FormLabel>학점</FormLabel>
        <Select
          value={credits ?? ""}
          onChange={(e) => onCreditsChange(e.target.value)}>
          <option value="">전체</option>
          <option value="1">1학점</option>
          <option value="2">2학점</option>
          <option value="3">3학점</option>
        </Select>
      </FormControl>
    </HStack>
  )
);

interface GradeFilterProps {
  grades: number[];
  onChange: (grades: number[]) => void;
}

const GradeFilter = memo(({ grades, onChange }: GradeFilterProps) => (
  <FormControl>
    <FormLabel>학년</FormLabel>
    <CheckboxGroup
      value={grades}
      onChange={(value) => onChange(value.map(Number))}>
      <HStack spacing={4}>
        {[1, 2, 3, 4].map((grade) => (
          <Checkbox key={grade} value={grade}>
            {grade}학년
          </Checkbox>
        ))}
      </HStack>
    </CheckboxGroup>
  </FormControl>
));

interface DayFilterProps {
  days: string[];
  onChange: (days: string[]) => void;
}

const DayFilter = memo(({ days, onChange }: DayFilterProps) => (
  <FormControl>
    <FormLabel>요일</FormLabel>
    <CheckboxGroup
      value={days}
      onChange={(value) => onChange(value as string[])}>
      <HStack spacing={4}>
        {DAY_LABELS.map((day) => (
          <Checkbox key={day} value={day}>
            {day}
          </Checkbox>
        ))}
      </HStack>
    </CheckboxGroup>
  </FormControl>
));

interface TimeFilterProps {
  times: number[];
  onChange: (times: number[]) => void;
  onRemoveTime: (time: number) => void;
}

const TimeFilter = memo(
  ({ times, onChange, onRemoveTime }: TimeFilterProps) => {
    const sortedTimes = useMemo(
      () => [...times].sort((a, b) => a - b),
      [times]
    );

    return (
      <FormControl>
        <FormLabel>시간</FormLabel>
        <CheckboxGroup
          colorScheme="green"
          value={times}
          onChange={(values) => onChange(values.map(Number))}>
          <Wrap spacing={1} mb={2}>
            {sortedTimes.map((time) => (
              <Tag key={time} size="sm" variant="outline" colorScheme="blue">
                <TagLabel>{time}교시</TagLabel>
                <TagCloseButton onClick={() => onRemoveTime(time)} />
              </Tag>
            ))}
          </Wrap>
          <Stack
            spacing={2}
            overflowY="auto"
            h="100px"
            border="1px solid"
            borderColor="gray.200"
            borderRadius={5}
            p={2}>
            {TIME_SLOTS.map(({ id, label }) => (
              <Box key={id}>
                <Checkbox key={id} size="sm" value={id}>
                  {id}교시({label})
                </Checkbox>
              </Box>
            ))}
          </Stack>
        </CheckboxGroup>
      </FormControl>
    );
  }
);

interface MajorFilterProps {
  majors: string[];
  allMajors: string[];
  onChange: (majors: string[]) => void;
  onRemoveMajor: (major: string) => void;
}

const MajorFilter = memo(
  ({ majors, allMajors, onChange, onRemoveMajor }: MajorFilterProps) => (
    <FormControl>
      <FormLabel>전공</FormLabel>
      <CheckboxGroup
        colorScheme="green"
        value={majors}
        onChange={(values) => onChange(values as string[])}>
        <Wrap spacing={1} mb={2}>
          {majors.map((major) => (
            <Tag key={major} size="sm" variant="outline" colorScheme="blue">
              <TagLabel>{major.split("<p>").pop()}</TagLabel>
              <TagCloseButton onClick={() => onRemoveMajor(major)} />
            </Tag>
          ))}
        </Wrap>
        <Stack
          spacing={2}
          overflowY="auto"
          h="100px"
          border="1px solid"
          borderColor="gray.200"
          borderRadius={5}
          p={2}>
          {allMajors.map((major) => (
            <Box key={major}>
              <Checkbox key={major} size="sm" value={major}>
                {major.replace(/<p>/gi, " ")}
              </Checkbox>
            </Box>
          ))}
        </Stack>
      </CheckboxGroup>
    </FormControl>
  )
);

interface SearchFiltersProps {
  query: string;
  credits?: SearchOption["credits"];
  grades: number[];
  days: string[];
  times: number[];
  majors: string[];
  onQueryChange: (value: string) => void;
  onCreditsChange: (value: string) => void;
  onGradesChange: (grades: number[]) => void;
  onDaysChange: (days: string[]) => void;
  onTimesChange: (times: number[]) => void;
  onRemoveTime: (time: number) => void;
  onMajorsChange: (majors: string[]) => void;
  onRemoveMajor: (major: string) => void;
  allMajors: string[];
}

const SearchFilters = memo(
  ({
    query,
    credits,
    grades,
    days,
    times,
    majors,
    onQueryChange,
    onCreditsChange,
    onGradesChange,
    onDaysChange,
    onTimesChange,
    onRemoveTime,
    onMajorsChange,
    onRemoveMajor,
    allMajors,
  }: SearchFiltersProps) => {
    return (
      <VStack spacing={4} align="stretch">
        <QueryCreditFilters
          query={query}
          credits={credits}
          onQueryChange={onQueryChange}
          onCreditsChange={onCreditsChange}
        />
        <HStack spacing={4}>
          <GradeFilter grades={grades} onChange={onGradesChange} />
          <DayFilter days={days} onChange={onDaysChange} />
        </HStack>
        <HStack spacing={4}>
          <TimeFilter
            times={times}
            onChange={onTimesChange}
            onRemoveTime={onRemoveTime}
          />
          <MajorFilter
            majors={majors}
            allMajors={allMajors}
            onChange={onMajorsChange}
            onRemoveMajor={onRemoveMajor}
          />
        </HStack>
      </VStack>
    );
  }
);

interface LectureTableProps {
  lectures: Lecture[];
  addSchedule: (lecture: Lecture) => void;
  listRef: RefObject<ListImperativeAPI | null>;
}

const LectureTable = memo(
  ({ lectures, addSchedule, listRef }: LectureTableProps) => {
    const itemData = useMemo<LectureRowData>(
      () => ({ lectures, addSchedule }),
      [lectures, addSchedule]
    );

    return (
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius={8}
        overflow="hidden">
        <Box
          bg="gray.100"
          px={2}
          py={2}
          borderBottom="1px solid"
          borderColor="gray.200">
          <Grid
            templateColumns={COLUMN_TEMPLATE}
            fontWeight="bold"
            fontSize="sm"
            gap={2}>
            <Text>과목코드</Text>
            <Text>학년</Text>
            <Text>과목명</Text>
            <Text>학점</Text>
            <Text>전공</Text>
            <Text>시간</Text>
            <Text textAlign="center">추가</Text>
          </Grid>
        </Box>

        {lectures.length === 0 ? (
          <Box py={12} textAlign="center">
            <Text color="gray.500">조건에 맞는 강의가 없습니다.</Text>
          </Box>
        ) : (
          <List
            listRef={listRef}
            rowCount={lectures.length}
            rowHeight={ROW_HEIGHT}
            rowComponent={VirtualizedLectureRow}
            rowProps={itemData}
            overscanCount={5}
            style={{ height: VIRTUAL_LIST_HEIGHT, width: "100%" }}
          />
        )}
      </Box>
    );
  }
);
// TODO: 이 컴포넌트에서 불필요한 연산이 발생하지 않도록 다양한 방식으로 시도해주세요.
const SearchDialog = ({ searchInfo, onClose }: Props) => {
  const { setSchedulesMap } = useScheduleContext();

  const listRef = useRef<ListImperativeAPI | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [scheduleCache, setScheduleCache] = useState<
    Record<string, ReturnType<typeof parseSchedule>>
  >({});
  const [searchOptions, setSearchOptions] = useState<SearchOption>({
    query: "",
    grades: [],
    days: [],
    times: [],
    majors: [],
  });
  const [queryInput, setQueryInput] = useState(searchOptions.query ?? "");
  const deferredQuery = useDeferredValue(queryInput);

  const filteredLectures = useMemo(() => {
    const start = performance.now();
    const { query = "", credits, grades, days, times, majors } = searchOptions;

    const result = lectures.filter((lecture) => {
      //1. query 필터
      if (query) {
        const queryLower = query.toLowerCase();
        const matchQuery =
          lecture.title.toLowerCase().includes(queryLower) ||
          lecture.id.toLowerCase().includes(queryLower);
        if (!matchQuery) return false;
      }

      //2. grades 필터
      if (grades.length > 0 && !grades.includes(lecture.grade)) {
        return false;
      }

      //3. majors 필터
      if (majors.length > 0 && !majors.includes(lecture.major)) {
        return false;
      }

      //4. credits 필터
      if (credits && !lecture.credits.startsWith(String(credits))) {
        return false;
      }

      // 5 & 6. Days와 Times 필터 (요일과 시간) - parseSchedule 한 번만 호출!
      if (days.length > 0 || times.length > 0) {
        const schedules = scheduleCache[lecture.id] ?? [];

        // Days 체크
        if (days.length > 0) {
          const matchesDay = schedules.some((s) => days.includes(s.day));
          if (!matchesDay) return false;
        }

        // Times 체크 (같은 schedules 재사용!)
        if (times.length > 0) {
          const matchesTime = schedules.some((s) =>
            s.range.some((time) => times.includes(time))
          );
          if (!matchesTime) return false;
        }
      }
      return true;
    });

    console.log(
      "필터링 완료 시간:",
      performance.now(),
      "걸린 시간(ms):",
      (performance.now() - start).toFixed(2)
    ); // ← useMemo 안으로!
    return result;
  }, [lectures, searchOptions, scheduleCache]);

  const allMajors = useMemo(
    () => [...new Set(lectures.map((lecture) => lecture.major))],
    [lectures]
  );

  const changeSearchOption = useAutoCallback(
    (field: keyof SearchOption, value: SearchOption[typeof field]) => {
      setSearchOptions((prev) => ({ ...prev, [field]: value }));
      listRef.current?.scrollToRow?.({ index: 0, align: "start" });
    }
  );

  const handleQueryChange = useAutoCallback((value: string) => {
    setQueryInput(value);
  });
  const handleCreditsChange = useAutoCallback((value: string) =>
    changeSearchOption("credits", value)
  );
  const handleGradesChange = useAutoCallback((grades: number[]) =>
    changeSearchOption("grades", grades)
  );
  const handleDaysChange = useAutoCallback((days: string[]) =>
    changeSearchOption("days", days)
  );
  const handleTimesChange = useAutoCallback((times: number[]) =>
    changeSearchOption("times", times)
  );
  const handleRemoveTime = useAutoCallback((time: number) =>
    changeSearchOption(
      "times",
      searchOptions.times.filter((v) => v !== time)
    )
  );
  const handleMajorsChange = useAutoCallback((majors: string[]) =>
    changeSearchOption("majors", majors)
  );
  const handleRemoveMajor = useAutoCallback((major: string) =>
    changeSearchOption(
      "majors",
      searchOptions.majors.filter((v) => v !== major)
    )
  );

  const addSchedule = useAutoCallback((lecture: Lecture) => {
    if (!searchInfo) return;

    const { tableId } = searchInfo;

    const schedules = (
      scheduleCache[lecture.id] ?? parseSchedule(lecture.schedule)
    ).map((schedule) => ({
      ...schedule,
      lecture,
    }));

    setSchedulesMap((prev) => ({
      ...prev,
      [tableId]: [...prev[tableId], ...schedules],
    }));

    onClose();
  });

  useEffect(() => {
    const start = performance.now();
    console.log("API 호출 시작: ", start);
    fetchAllLectures().then((results) => {
      const end = performance.now();
      console.log("모든 API 호출 완료 ", end);
      console.log("API 호출에 걸린 시간(ms): ", end - start);
      const fetchedLectures = results.flatMap((result) => result.data);
      setLectures(fetchedLectures);
      setScheduleCache(() => {
        const cache: Record<string, ReturnType<typeof parseSchedule>> = {};
        fetchedLectures.forEach((lecture) => {
          cache[lecture.id] = lecture.schedule
            ? parseSchedule(lecture.schedule)
            : [];
        });
        return cache;
      });
    });
  }, []);

  useEffect(() => {
    setSearchOptions((prev) => ({
      ...prev,
      days: searchInfo?.day ? [searchInfo.day] : [],
      times: searchInfo?.time ? [searchInfo.time] : [],
    }));
    listRef.current?.scrollToRow?.({ index: 0, align: "start" });
  }, [searchInfo]);

  useEffect(() => {
    if (searchOptions.query !== deferredQuery) {
      changeSearchOption("query", deferredQuery);
    }
  }, [deferredQuery, searchOptions.query, changeSearchOption]);

  useEffect(() => {
    if (searchOptions.query !== queryInput) {
      setQueryInput(searchOptions.query ?? "");
    }
  }, [searchOptions.query]);

  return (
    <Modal isOpen={Boolean(searchInfo)} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxW="90vw" w="1000px">
        <ModalHeader>수업 검색</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SearchFilters
            query={queryInput}
            credits={searchOptions.credits}
            grades={searchOptions.grades}
            days={searchOptions.days}
            times={searchOptions.times}
            majors={searchOptions.majors}
            onQueryChange={handleQueryChange}
            onCreditsChange={handleCreditsChange}
            onGradesChange={handleGradesChange}
            onDaysChange={handleDaysChange}
            onTimesChange={handleTimesChange}
            onRemoveTime={handleRemoveTime}
            onMajorsChange={handleMajorsChange}
            onRemoveMajor={handleRemoveMajor}
            allMajors={allMajors}
          />

          <Text align="right">검색결과: {filteredLectures.length}개</Text>

          <LectureTable
            lectures={filteredLectures}
            addSchedule={addSchedule}
            listRef={listRef}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SearchDialog;
