import React, { useEffect, useMemo } from "react";
import { Progress } from "./components/ui/progress";
import { Button } from "./components/ui/button";
import { parseAvailableTests, parseTimesPage } from "./utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";

const REFRESH_INTERVAL = 10;

function formatNameString(startDate, startTime, endTime, endDate, testName) {
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const startTimeObj = new Date(startTime);
  const endTimeObj = new Date(endTime);
  const startDateString = startDateObj.toLocaleDateString("ru-RU", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const endDateString = endDateObj.toLocaleDateString("ru-RU", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return [
    `"${testName}"`,
    [startDateString, ...(endDate ? [endDateString] : [])].join(" - "),
    `${startTime} -  ${endTime}`,
  ];
}

const formatElapsedTime = (startTime: number) => {
  const diff = Date.now() - startTime;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const parts = [];
  if (days > 0) parts.push(`${days}д`);
  if (hours > 0 || days > 0)
    parts.push(`${hours.toString().padStart(2, "0")}ч`);
  parts.push(`${minutes.toString().padStart(2, "0")}м`);
  parts.push(`${seconds.toString().padStart(2, "0")}с`);

  return parts.join(" ");
};

export default function ProgressModal() {
  const [progress, setProgress] = React.useState(0);
  const [startTime, setStartTime] = React.useState(0);
  const [testName, setTestName] = React.useState([""]);
  const [isDateFound, setIsDateFound] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isCanceling, setIsCanceling] = React.useState(false);
  const [availableDates, setAvailableDates] = React.useState([]);
  const [parsedTimes, setParsedTimes] = React.useState({});
  const [dateRange, setDateRange] = React.useState({
    startDate: "",
    endDate: "",
  });
  const foundDate = React.useRef(null);
  const timeout = React.useRef<any>();

  useEffect(() => {
    chrome.storage.local.get(
      [
        "startDate",
        "endDate",
        "testId",
        "runnerStartTime",
        "startTime",
        "endTime",
      ],
      async function (result) {
        const test = parseAvailableTests().find(
          (test) => test.id === result.testId
        );
        const name = test?.title;
        setTestName(
          formatNameString(
            result.startDate,
            result.startTime,
            result.endTime,
            result.endDate,
            name
          )
        );
        setStartTime(result.runnerStartTime);
        setDateRange({
          startDate: result.startDate,
          endDate: result.endDate || result.startDate,
        });

        // Filter dates within ±2 days of selected range
        const dates = test?.availableDates || [];
        const startDateObj = new Date(result.startDate);
        const endDateObj = result.endDate
          ? new Date(result.endDate)
          : new Date(result.startDate);

        const filteredDates = dates
          .filter(({ parsedDate }) => {
            const [year, month, day] = parsedDate.split("-");
            const currentDate = new Date(+year, +month - 1, +day);

            // Create range bounds (±2 days)
            const rangeStart = new Date(startDateObj);
            rangeStart.setDate(rangeStart.getDate() - 2);
            const rangeEnd = new Date(endDateObj);
            rangeEnd.setDate(rangeEnd.getDate() + 2);

            // Reset hours for correct comparison
            currentDate.setHours(0, 0, 0, 0);
            rangeStart.setHours(0, 0, 0, 0);
            rangeEnd.setHours(0, 0, 0, 0);

            return currentDate >= rangeStart && currentDate <= rangeEnd;
          })
          .slice(0, 3); // Take only first 3 dates

        setAvailableDates(filteredDates);

        // Parse times for filtered dates
        for (const date of filteredDates) {
          try {
            const parsedTimes = await parseTimesPage(date.link);
            if (parsedTimes.length > 0) {
              // Only set times if there are any
              setParsedTimes((prev) => ({
                ...prev,
                [date.parsedDate]: parsedTimes,
              }));
            }
          } catch (e) {
            console.error("Failed to parse times for date", date.parsedDate, e);
          }
        }

        const match = filteredDates.find(({ parsedDate }) => {
          const [year, month, day] = parsedDate.split("-");
          const startDate = new Date(result.startDate);
          const endDate = new Date(result.endDate);
          const currentDate = new Date(+year, +month - 1, +day);

          startDate.setHours(0, 0, 0, 0);
          currentDate.setHours(0, 0, 0, 0);
          if (endDate) {
            endDate.setHours(0, 0, 0, 0);
          }

          const dateIsAfterStart = currentDate >= startDate;
          const dateIsBeforeEnd = result.endDate
            ? currentDate <= endDate
            : true;

          return dateIsAfterStart && dateIsBeforeEnd;
        });

        if (match) {
          foundDate.current = match.link;
          setIsDateFound(true);
        }

        setProgress(100);
        timeout.current = setTimeout(() => {
          setIsRefreshing(true);
          if (foundDate.current) {
            window.location.href = foundDate.current;
          } else {
            window.location.reload();
          }
        }, REFRESH_INTERVAL * 1000);
      }
    );

    return () => clearTimeout(timeout.current);
  }, []);

  const time = useMemo(() => {
    return formatElapsedTime(startTime);
  }, [progress, startTime]);

  const handleCancel = () => {
    setIsCanceling(true);
    chrome.storage.local.set({ isRunning: false }, function () {
      window.location.reload();
    });
  };

  const handleTimeClick = (link: string) => {
    chrome.storage.local.set({ isRunning: false }, function () {
      window.location.href = link;
    });
  };

  const status = useMemo(() => {
    if (isCanceling) {
      return "Надеюсь вы сможете найти свой термин в следующий раз!";
    }
    if (isRefreshing) {
      return "Рефрешимся...";
    }
    if (isDateFound) {
      return "Дата найдена, сейчас посмотрим время!";
    } else {
      return "Ждём благословение пана Меруньки...";
    }
  }, [isDateFound, isRefreshing, isCanceling]);

  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split("-");
    return new Date(+year, +month - 1, +day).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get the range bounds
    const rangeStart = new Date(start);
    rangeStart.setDate(rangeStart.getDate() - 2);
    const rangeEnd = new Date(end);
    rangeEnd.setDate(rangeEnd.getDate() + 2);

    return `(${rangeStart.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    })} - ${rangeEnd.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    })})`;
  };

  return (
    <div className="fixed top-16 right-4 bg-white p-4 rounded-md shadow-lg z-[5000] w-[32rem] max-h-[calc(100vh-8rem)] overflow-auto text-black [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100">
      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <WandIcon className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold mb-0">{status}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Progress
            className="flex-1"
            value={progress}
            duration={REFRESH_INTERVAL}
          />
        </div>
        <div className="flex justify-between flex-col">
          {testName.map((name, i) => (
            <div key={i} className="text-sm font-medium">
              {name}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Общее время поиска: </div>
          <div className="text-sm font-medium">{time}</div>
        </div>
        {availableDates.length > 0 && (
          <div className="mt-2">
            <div className="flex flex-col gap-1 mb-2">
              <h4 className="text-sm font-medium">Доступные даты и время:</h4>
              <span className="text-xs text-gray-500">
                {formatDateRange(dateRange.startDate, dateRange.endDate)}
              </span>
            </div>
            <div className="grid gap-3 max-h-[400px] overflow-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100">
              {availableDates.map(({ parsedDate }, index) =>
                parsedTimes[parsedDate] &&
                parsedTimes[parsedDate].length > 0 ? (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="font-medium text-sm mb-2">
                      {formatDate(parsedDate)}
                    </div>
                    <div className="grid grid-cols-6 gap-1">
                      {parsedTimes[parsedDate]?.map((time, timeIndex) => (
                        <button
                          key={timeIndex}
                          onClick={() => handleTimeClick(time.link)}
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
                ) : null
              )}
            </div>
          </div>
        )}
        <Button className="justify-self-end mt-2" onClick={handleCancel}>
          Охрана, отмена!
        </Button>
      </div>
    </div>
  );
}

function WandIcon(props) {
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
