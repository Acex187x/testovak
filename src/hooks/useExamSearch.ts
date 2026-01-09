/**
 * React хук для управления поиском и записью на экзамены
 *
 * Инкапсулирует всю логику:
 * - Загрузки состояния поиска из Chrome Storage
 * - Поиска доступных дат и временных слотов
 * - Автообновления страницы
 * - Отмены поиска
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { parseAvailableTests, parseTimesPage } from "../utils";
import { TimeSlot, AvailableDate, ExamStorageState } from "../types";

// ============================================================================
// Константы
// ============================================================================

/** Интервал автообновления страницы в секундах */
export const REFRESH_INTERVAL = 10;

/** Количество дней для расширения диапазона поиска */
const DATE_RANGE_EXTENSION_DAYS = 2;

/** Максимальное количество дат для отображения */
const MAX_DATES_TO_DISPLAY = 3;

// ============================================================================
// Вспомогательные функции форматирования
// ============================================================================

/**
 * Форматирует информацию о тесте для отображения в UI
 */
function formatTestDisplayInfo(
  config: Pick<
    ExamStorageState,
    "startDate" | "endDate" | "startTime" | "endTime"
  >,
  testName: string,
): string[] {
  const { startDate, endDate, startTime, endTime } = config;

  const startDateObj = new Date(startDate);
  const endDateObj = endDate ? new Date(endDate) : null;

  const dateFormatOptions: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };

  const startDateString = startDateObj.toLocaleDateString(
    "ru-RU",
    dateFormatOptions,
  );
  const endDateString = endDateObj?.toLocaleDateString(
    "ru-RU",
    dateFormatOptions,
  );

  const dateRangeParts = [startDateString];
  if (endDateString && endDateString !== startDateString) {
    dateRangeParts.push(endDateString);
  }

  return [
    `"${testName}"`,
    dateRangeParts.join(" - "),
    `${startTime} - ${endTime}`,
  ];
}

/**
 * Форматирует прошедшее время с момента начала поиска
 */
export function formatElapsedTime(startTime: number): string {
  const diff = Date.now() - startTime;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}д`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours.toString().padStart(2, "0")}ч`);
  }
  parts.push(`${minutes.toString().padStart(2, "0")}м`);
  parts.push(`${seconds.toString().padStart(2, "0")}с`);

  return parts.join(" ");
}

/**
 * Форматирует дату для отображения в UI (например, "15 января")
 */
export function formatDateForDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return new Date(+year, +month - 1, +day).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

/**
 * Форматирует расширенный диапазон дат (±2 дня)
 */
export function formatExtendedDateRange(
  startDate: string,
  endDate: string,
): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const rangeStart = new Date(start);
  rangeStart.setDate(rangeStart.getDate() - DATE_RANGE_EXTENSION_DAYS);

  const rangeEnd = new Date(end);
  rangeEnd.setDate(rangeEnd.getDate() + DATE_RANGE_EXTENSION_DAYS);

  const formatOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
  };

  return `(${rangeStart.toLocaleDateString(
    "ru-RU",
    formatOptions,
  )} - ${rangeEnd.toLocaleDateString("ru-RU", formatOptions)})`;
}

// ============================================================================
// Вспомогательные функции работы с датами
// ============================================================================

/**
 * Парсит строку даты в объект Date (без учета времени)
 */
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-");
  const date = new Date(+year, +month - 1, +day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Проверяет, находится ли дата в заданном диапазоне
 */
function isDateInRange(date: Date, rangeStart: Date, rangeEnd: Date): boolean {
  return date >= rangeStart && date <= rangeEnd;
}

/**
 * Создает расширенный диапазон дат (±N дней от исходного)
 */
function createExtendedDateRange(
  startDate: Date,
  endDate: Date,
  extensionDays: number = DATE_RANGE_EXTENSION_DAYS,
): { rangeStart: Date; rangeEnd: Date } {
  const rangeStart = new Date(startDate);
  rangeStart.setDate(rangeStart.getDate() - extensionDays);
  rangeStart.setHours(0, 0, 0, 0);

  const rangeEnd = new Date(endDate);
  rangeEnd.setDate(rangeEnd.getDate() + extensionDays);
  rangeEnd.setHours(0, 0, 0, 0);

  return { rangeStart, rangeEnd };
}

/**
 * Фильтрует доступные даты по заданному диапазону с расширением ±2 дня
 */
function filterDatesWithinRange(
  availableDates: AvailableDate[],
  startDate: string,
  endDate?: string,
): AvailableDate[] {
  const startDateObj = parseDateString(startDate);
  const endDateObj = endDate ? parseDateString(endDate) : startDateObj;

  const { rangeStart, rangeEnd } = createExtendedDateRange(
    startDateObj,
    endDateObj,
  );

  return availableDates
    .filter(({ parsedDate }) => {
      const currentDate = parseDateString(parsedDate);
      return isDateInRange(currentDate, rangeStart, rangeEnd);
    })
    .slice(0, MAX_DATES_TO_DISPLAY);
}

/**
 * Ищет первую дату, которая точно соответствует заданному диапазону
 */
function findExactMatchingDate(
  filteredDates: AvailableDate[],
  startDate: string,
  endDate?: string,
): AvailableDate | null {
  const startDateObj = parseDateString(startDate);
  const endDateObj = endDate ? parseDateString(endDate) : null;

  return (
    filteredDates.find(({ parsedDate }) => {
      const currentDate = parseDateString(parsedDate);

      const isAfterStart = currentDate >= startDateObj;
      const isBeforeEnd = endDateObj ? currentDate <= endDateObj : true;

      return isAfterStart && isBeforeEnd;
    }) || null
  );
}

// ============================================================================
// Работа с Chrome Storage
// ============================================================================

/**
 * Получает текущее состояние поиска из Chrome Storage
 */
function getSearchState(): Promise<ExamStorageState> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [
        "isRunning",
        "startDate",
        "endDate",
        "startTime",
        "endTime",
        "testId",
        "runnerStartTime",
      ],
      (result) => {
        resolve(result as ExamStorageState);
      },
    );
  });
}

/**
 * Сохраняет состояние поиска в Chrome Storage
 */
function saveSearchState(state: Partial<ExamStorageState>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(state, () => {
      resolve();
    });
  });
}

// ============================================================================
// Типы для хука
// ============================================================================

export interface UseExamSearchState {
  /** Прогресс загрузки (0-100) */
  progress: number;
  /** Время начала поиска (timestamp) */
  startTime: number;
  /** Информация о тесте для отображения [название, даты, время] */
  testName: string[];
  /** Найдена ли подходящая дата */
  isDateFound: boolean;
  /** Идёт ли процесс обновления страницы */
  isRefreshing: boolean;
  /** Идёт ли процесс отмены */
  isCanceling: boolean;
  /** Список доступных дат */
  availableDates: AvailableDate[];
  /** Временные слоты по датам */
  parsedTimes: Record<string, TimeSlot[]>;
  /** Диапазон дат поиска */
  dateRange: { startDate: string; endDate: string };
}

export interface UseExamSearchActions {
  /** Отменить поиск */
  cancelSearch: () => void;
  /** Выбрать временной слот и перейти к записи */
  selectTimeSlot: (link: string) => void;
}

export interface UseExamSearchReturn extends UseExamSearchState {
  /** Действия */
  actions: UseExamSearchActions;
  /** Форматированное время поиска */
  elapsedTime: string;
  /** Текущий статус поиска */
  status: string;
}

// ============================================================================
// Основной хук
// ============================================================================

/**
 * Хук для управления поиском экзамена
 *
 * @returns Состояние поиска и действия для управления
 *
 * @example
 * ```tsx
 * function ExamSearchModal() {
 *   const {
 *     status,
 *     elapsedTime,
 *     availableDates,
 *     parsedTimes,
 *     actions
 *   } = useExamSearch();
 *
 *   return (
 *     <div>
 *       <h1>{status}</h1>
 *       <p>Время поиска: {elapsedTime}</p>
 *       <button onClick={actions.cancelSearch}>Отмена</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useExamSearch(): UseExamSearchReturn {
  // Состояние UI
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [testName, setTestName] = useState<string[]>([""]);
  const [isDateFound, setIsDateFound] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Состояние данных
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [parsedTimes, setParsedTimes] = useState<Record<string, TimeSlot[]>>(
    {},
  );
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  // Refs
  const foundDateRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  /**
   * Загружает временные слоты для списка дат
   */
  const loadTimeSlotsForDates = useCallback(async (dates: AvailableDate[]) => {
    for (const date of dates) {
      try {
        const times = await parseTimesPage(date.link);

        if (times.length > 0) {
          setParsedTimes((prev) => ({
            ...prev,
            [date.parsedDate]: times,
          }));
        }
      } catch (error) {
        console.error(
          `Failed to parse times for date ${date.parsedDate}:`,
          error,
        );
      }
    }
  }, []);

  /**
   * Инициализация поиска
   */
  useEffect(() => {
    async function initializeSearch() {
      const state = await getSearchState();

      // Получаем информацию о тесте
      const tests = parseAvailableTests();
      const test = tests.find((t) => t.id === state.testId);
      const testTitle = test?.title || "";

      // Форматируем информацию для отображения
      setTestName(
        formatTestDisplayInfo(
          {
            startDate: state.startDate,
            endDate: state.endDate,
            startTime: state.startTime,
            endTime: state.endTime,
          },
          testTitle,
        ),
      );

      setStartTime(state.runnerStartTime);
      setDateRange({
        startDate: state.startDate,
        endDate: state.endDate || state.startDate,
      });

      // Фильтруем даты в пределах ±2 дней от выбранного диапазона
      const dates = test?.availableDates || [];
      const filteredDates = filterDatesWithinRange(
        dates,
        state.startDate,
        state.endDate,
      );

      setAvailableDates(filteredDates);

      // Загружаем временные слоты для отфильтрованных дат
      await loadTimeSlotsForDates(filteredDates);

      // Ищем точное совпадение с выбранным диапазоном
      const matchingDate = findExactMatchingDate(
        filteredDates,
        state.startDate,
        state.endDate,
      );

      if (matchingDate) {
        foundDateRef.current = matchingDate.link;
        setIsDateFound(true);
      }

      // Устанавливаем прогресс и планируем обновление
      setProgress(100);

      timeoutRef.current = setTimeout(() => {
        setIsRefreshing(true);

        if (foundDateRef.current) {
          window.location.href = foundDateRef.current;
        } else {
          window.location.reload();
        }
      }, REFRESH_INTERVAL * 1000);
    }

    initializeSearch();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loadTimeSlotsForDates]);

  /**
   * Форматированное время поиска
   */
  const elapsedTime = useMemo(() => {
    return formatElapsedTime(startTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, startTime]);

  /**
   * Текущий статус поиска
   */
  const status = useMemo(() => {
    if (isCanceling) {
      return "Надеюсь вы сможете найти свой термин в следующий раз!";
    }
    if (isRefreshing) {
      return "Рефрешимся...";
    }
    if (isDateFound) {
      return "Дата найдена, сейчас посмотрим время!";
    }
    return "Ждём благословение пана Меруньки...";
  }, [isDateFound, isRefreshing, isCanceling]);

  /**
   * Отмена поиска
   */
  const cancelSearch = useCallback(() => {
    setIsCanceling(true);
    saveSearchState({ isRunning: false }).then(() => {
      window.location.reload();
    });
  }, []);

  /**
   * Выбор временного слота
   */
  const selectTimeSlot = useCallback((link: string) => {
    saveSearchState({ isRunning: false }).then(() => {
      window.location.href = link;
    });
  }, []);

  return {
    // Состояние
    progress,
    startTime,
    testName,
    isDateFound,
    isRefreshing,
    isCanceling,
    availableDates,
    parsedTimes,
    dateRange,

    // Вычисляемые значения
    elapsedTime,
    status,

    // Действия
    actions: {
      cancelSearch,
      selectTimeSlot,
    },
  };
}
