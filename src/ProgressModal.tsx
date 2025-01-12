import React, { useEffect, useMemo } from "react";
import { Progress } from "./components/ui/progress";
import { Button } from "./components/ui/button";
import { parseAvailableTests } from "./utils";

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

export default function ProgressModal() {
  const [progress, setProgress] = React.useState(0);
  const [startTime, setStartTime] = React.useState(0);
  const [testName, setTestName] = React.useState([""]);
  const [isDateFound, setIsDateFound] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isCanceling, setIsCanceling] = React.useState(false);
  const foundDate = React.useRef(null);
  const interval = React.useRef<any>();
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
      function (result) {
        const name = parseAvailableTests().find(
          (test) => test.id === result.testId
        )?.title;
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
        const { availableDates } = parseAvailableTests().find(
          (test) => test.id === result.testId
        ) || { availableDates: [] };

        const match = availableDates.find(({ parsedDate }) => {
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

          console.log("Date comparison:", {
            parsedDate,
            startDateStr: result.startDate,
            endDateStr: result.endDate,
            startDate: startDate.toISOString(),
            currentDate: currentDate.toISOString(),
            endDate: endDate?.toISOString(),
            dateIsAfterStart,
            dateIsBeforeEnd,
          });

          return dateIsAfterStart && dateIsBeforeEnd;
        });
        if (match) {
          foundDate.current = match.link;
          setIsDateFound(true);
        }
        interval.current = setInterval(() => {
          setProgress((prev) => {
            const newVal = prev + 100 / (REFRESH_INTERVAL * 10);
            if (newVal >= 100) {
              clearInterval(interval.current);
              setIsRefreshing(true);
              if (foundDate.current) {
                window.location.href = foundDate.current;
              } else {
                window.location.reload();
              }
              return 100;
            } else {
              return newVal;
            }
          });
        }, 100);
      }
    );

    return () => clearInterval(interval.current);
  }, []);

  const time = useMemo(() => {
    const diff = Date.now() - startTime;

    return `${Math.floor(diff / 1000 / 60)
      .toString()
      .padStart(2, "0")}:${(Math.floor(diff / 1000) % 60)
      .toString()
      .padStart(2, "0")}`;
  }, [progress, startTime]);

  const handleCancel = () => {
    setIsCanceling(true);
    chrome.storage.local.set({ isRunning: false }, function () {
      window.location.reload();
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

  return (
    <div className="fixed top-16 right-4 bg-white p-4 rounded-md shadow-lg dark:shadow-gray-800 z-50 w-[25rem]">
      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <WandIcon className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold mb-0">{status}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Progress className="flex-1" value={progress} />
        </div>
        <div className="flex justify-between w-[20rem] flex-col">
          {testName.map((name, i) => (
            <div key={i} className="text-sm font-medium">
              {name}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Общее время поиска:{" "}
          </div>
          <div className="text-sm font-medium">{time}</div>
        </div>
        <Button className="justify-self-end" onClick={handleCancel}>
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
