import React from "react";
import { Progress } from "./components/ui/progress";
import { Button } from "./components/ui/button";
import {
  useExamSearch,
  REFRESH_INTERVAL,
  formatDateForDisplay,
  formatExtendedDateRange,
} from "./hooks/useExamSearch";
import { TimeSlot, AvailableDate } from "./types";

/**
 * Компонент модального окна прогресса поиска экзамена
 *
 * Отображает:
 * - Текущий статус поиска
 * - Прогресс-бар с автообновлением
 * - Информацию о выбранном тесте
 * - Доступные даты и временные слоты
 * - Кнопку отмены поиска
 */
export default function ProgressModal() {
  const {
    status,
    progress,
    testName,
    elapsedTime,
    availableDates,
    parsedTimes,
    dateRange,
    actions,
  } = useExamSearch();

  return (
    <div className="fixed top-16 right-4 bg-white p-4 rounded-md shadow-lg z-[5000] w-[32rem] max-h-[calc(100vh-8rem)] overflow-auto text-black [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100">
      <div className="grid gap-4">
        {/* Заголовок со статусом */}
        <div className="flex items-center gap-2">
          <WandIcon className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold mb-0">{status}</h3>
        </div>

        {/* Прогресс-бар */}
        <div className="flex items-center gap-2">
          <Progress
            className="flex-1"
            value={progress}
            duration={REFRESH_INTERVAL}
          />
        </div>

        {/* Информация о тесте */}
        <div className="flex justify-between flex-col">
          {testName.map((name, i) => (
            <div key={i} className="text-sm font-medium">
              {name}
            </div>
          ))}
        </div>

        {/* Время поиска */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Общее время поиска: </div>
          <div className="text-sm font-medium">{elapsedTime}</div>
        </div>

        {/* Доступные даты и временные слоты */}
        {availableDates.length > 0 && (
          <AvailableDatesSection
            availableDates={availableDates}
            parsedTimes={parsedTimes}
            dateRange={dateRange}
            onTimeClick={actions.selectTimeSlot}
          />
        )}

        {/* Кнопка отмены */}
        <Button
          className="justify-self-end mt-2"
          onClick={actions.cancelSearch}
        >
          Охрана, отмена!
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Вспомогательные компоненты
// ============================================================================

interface AvailableDatesSectionProps {
  availableDates: AvailableDate[];
  parsedTimes: Record<string, TimeSlot[]>;
  dateRange: { startDate: string; endDate: string };
  onTimeClick: (link: string) => void;
}

/**
 * Секция с доступными датами и временными слотами
 */
function AvailableDatesSection({
  availableDates,
  parsedTimes,
  dateRange,
  onTimeClick,
}: AvailableDatesSectionProps) {
  return (
    <div className="mt-2">
      <div className="flex flex-col gap-1 mb-2">
        <h4 className="text-sm font-medium">Доступные даты и время:</h4>
        <span className="text-xs text-gray-500">
          {formatExtendedDateRange(dateRange.startDate, dateRange.endDate)}
        </span>
      </div>
      <div className="grid gap-3 max-h-[400px] overflow-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100">
        {availableDates.map(({ parsedDate }, index) => {
          const times = parsedTimes[parsedDate];

          if (!times || times.length === 0) {
            return null;
          }

          return (
            <DateCard
              key={index}
              date={parsedDate}
              times={times}
              onTimeClick={onTimeClick}
            />
          );
        })}
      </div>
    </div>
  );
}

interface DateCardProps {
  date: string;
  times: TimeSlot[];
  onTimeClick: (link: string) => void;
}

/**
 * Карточка с датой и её временными слотами
 */
function DateCard({ date, times, onTimeClick }: DateCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="font-medium text-sm mb-2">
        {formatDateForDisplay(date)}
      </div>
      <div className="grid grid-cols-6 gap-1">
        {times.map((time, timeIndex) => (
          <button
            key={timeIndex}
            onClick={() => onTimeClick(time.link)}
            className="text-xs bg-white text-black px-2 py-1 rounded shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-colors border border-gray-100 cursor-pointer text-center"
          >
            {new Date(time.dateTime).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Иконка волшебной палочки
 */
function WandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 4V2" />
      <path d="M15 16v-2" />
      <path d="M8 9h2" />
      <path d="M20 9h2" />
      <path d="M17.8 11.8 19 13" />
      <path d="M15 9h0" />
      <path d="M17.8 6.2 19 5" />
      <path d="m3 21 9-9" />
      <path d="M12.2 6.2 11 5" />
    </svg>
  );
}
