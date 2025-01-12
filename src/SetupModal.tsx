import React, { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "./components/ui/button";
import {
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogContent,
  Dialog,
} from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import {
  PopoverTrigger,
  PopoverContent,
  Popover,
} from "./components/ui/popover";
import { Calendar } from "./components/ui/calendar";
import {
  SelectValue,
  SelectTrigger,
  SelectItem,
  SelectGroup,
  SelectContent,
  Select,
} from "./components/ui/select";
import {
  compareDateStings,
  convertDate,
  parseAvailableTests,
  parseTimesPage,
} from "./utils";
import { formatDate } from "./components/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";

export function SetupModal() {
  const [modalState, setModalState] = React.useState({
    open: false,
    selectedTestId: "",
  });
  const [startDate, setStartDate] = React.useState(convertDate(new Date()));
  const [endDate, setEndDate] = React.useState(convertDate(new Date()));
  const [startTime, setStartTime] = React.useState("08:00");
  const [endTime, setEndTime] = React.useState("19:00");

  const onDateRangeChange = (res: { from: Date; to: Date } | undefined) => {
    if (res) {
      const { from, to } = res;
      console.log(
        convertDate(from) === convertDate(to),
        convertDate(from),
        convertDate(to)
      );
      if (convertDate(from) === (convertDate(to) || endDate)) {
        const dateStr = convertDate(from);
        setStartDate(dateStr);
        setEndDate(dateStr);
        return;
      }
      if (from) {
        setStartDate(convertDate(from));
      }
      if (to) {
        setEndDate(convertDate(to));
      }
    } else {
      setStartDate(null);
      setEndDate(null);
    }
  };

  const tests = useMemo(parseAvailableTests, []);
  const selectedTest = tests.find((t) => t.id === modalState.selectedTestId);
  const openFrom = tests.find(
    (t) => t.id === modalState.selectedTestId
  )?.openFrom;
  const openTo = tests.find((t) => t.id === modalState.selectedTestId)?.openTo;

  const [extendedAvailableDate, setExtendedAvailableDate] = useState([]);
  const extendedAvailableDateLoading = useRef([]);
  console.log(extendedAvailableDate);
  // Lazy load and cache available times for dates selected to extendedAvailableDate
  useEffect(() => {
    (async () => {
      if (startDate && selectedTest) {
        const dates = selectedTest.availableDates
          .filter(({ parsedDate }) => {
            return (
              compareDateStings(parsedDate, startDate) >= 0 &&
              (!endDate || compareDateStings(parsedDate, endDate) <= 0)
            );
          })
          .slice(0, 3)
          .filter(
            ({ parsedDate }) =>
              !extendedAvailableDate.find((d) => d.date === parsedDate)
          );
        let extendedDates = [];
        for (const date of dates) {
          if (
            extendedAvailableDateLoading.current.find(
              (d) =>
                d.parsedDate === date.parsedDate && d.testId === selectedTest.id
            )
          ) {
            continue;
          }
          extendedAvailableDateLoading.current.push({
            parsedDate: date.parsedDate,
            testId: selectedTest.id,
          });
          const times = await parseTimesPage(date.link);
          await new Promise((r) => setTimeout(r, 500));
          extendedDates.push({
            date: date.parsedDate,
            testId: selectedTest.id,
            times,
          });
          setExtendedAvailableDate((prev) =>
            [...prev, ...extendedDates].filter(
              (v, i, a) =>
                a.findIndex(
                  (t) => t.date === v.date && t.testId === v.testId
                ) === i
            )
          );
          extendedAvailableDateLoading.current =
            extendedAvailableDateLoading.current.filter(
              (d) =>
                d.parsedDate !== date.parsedDate && d.testId !== selectedTest.id
            );
        }
      }
    })();
  }, [selectedTest, startDate, endDate]);

  useEffect(() => {
    document.addEventListener("openTestovakModal", (e: CustomEvent) => {
      console.log("open", e.detail, tests);
      setModalState({
        open: true,
        selectedTestId: e.detail,
      });
    });
  }, []);

  // Set start and end date to the start and end of the test
  useEffect(() => {
    if (modalState.selectedTestId) {
      const test = tests.find((t) => t.id === modalState.selectedTestId);
      if (test) {
        const newStartDate = new Date(
          new Date() > test.openFrom ? Date.now() : test.openFrom
        );
        const newEndDate = new Date(test.openTo);
        setStartDate(convertDate(newStartDate));
        setEndDate(convertDate(newEndDate));
      }
    }
  }, [modalState]);

  const handleClose = () => {
    setModalState((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const handleSubmit = () => {
    chrome.storage.local.set({
      isRunning: true,
      startDate: startDate,
      startTime,
      endDate: endDate || null,
      endTime,
      runnerStartTime: Date.now(),
      testId: modalState.selectedTestId,
    });
    location.reload();
  };

  const canSubmit =
    startDate && startTime && endTime && modalState.selectedTestId;

  const timeSlotsToRender = useMemo(() => {
    if (startDate && selectedTest) {
      const dates = extendedAvailableDate.filter(({ date }) => {
        if (!endDate) {
          return date === startDate;
        } else {
          return (
            compareDateStings(date, startDate) >= 0 &&
            compareDateStings(date, endDate) <= 0
          );
        }
      });
      return dates
        .filter(({ date, times }) => {
          return times.some(({ dateTime }) => {
            const [hours, minutes] = startTime.split(":");
            const startDate = new Date(dateTime);
            startDate.setHours(+hours);
            startDate.setMinutes(+minutes);
            const [endHours, endMinutes] = endTime.split(":");
            const endDate = new Date(dateTime);
            endDate.setHours(+endHours);
            endDate.setMinutes(+endMinutes);
            return (
              dateTime >= new Date(startDate) && dateTime <= new Date(endDate)
            );
          });
        })
        .map(({ date, times }) => {
          return (
            <TableRow key={date}>
              <TableCell className="font-medium">{formatDate(date)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {times
                    .filter(({ dateTime }) => {
                      const [hours, minutes] = startTime.split(":");
                      const startDate = new Date(dateTime);
                      startDate.setHours(+hours);
                      startDate.setMinutes(+minutes);
                      const [endHours, endMinutes] = endTime.split(":");
                      const endDate = new Date(dateTime);
                      endDate.setHours(+endHours);
                      endDate.setMinutes(+endMinutes);
                      return (
                        dateTime >= new Date(startDate) &&
                        dateTime <= new Date(endDate)
                      );
                    })
                    .map((time) => (
                      <Button
                        size="sm"
                        variant="ghost"
                        key={time.dateTime}
                        onClick={() => {
                          window.location.href = time.link;
                        }}
                      >
                        {new Date(time.dateTime).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Button>
                    ))}
                </div>
              </TableCell>
            </TableRow>
          );
        });
    }
  }, [startDate, endDate, startTime, endTime, extendedAvailableDate]);

  return (
    <Dialog
      open={modalState.open}
      onOpenChange={(open) => {
        setModalState((prev) => ({
          ...prev,
          open,
        }));
      }}
    >
      <DialogContent className="sm:max-w-[60vw]">
        <DialogHeader>
          <DialogTitle>Настройка поиска</DialogTitle>
          <DialogDescription>
            Здесь ты можешь выбрать промежуток времени в котором расширение
            будет искать доступные даты. Ты не можете выбрать тесты на которые
            ты уже записан или они уже прошли.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right" htmlFor="start-date">
              Тест
            </Label>
            <div className="items-center gap-2 col-span-2">
              <Select
                value={modalState.selectedTestId}
                onValueChange={(value) => {
                  setModalState((prev) => ({
                    ...prev,
                    selectedTestId: value,
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      tests.find((t) => t.id === modalState.selectedTestId)
                        ?.title
                    }
                    className={"text-left"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {tests.map((test) => (
                      <SelectItem
                        key={test.id}
                        value={test.id}
                        disabled={!test.isAvailable}
                      >
                        {test.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right" htmlFor="start-date">
              Тест открыт
            </Label>
            <div className="items-center gap-2 col-span-2">
              <span>
                от {formatDate(openFrom)} до {formatDate(openTo)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right" htmlFor="start-date">
              Промежуток дат
            </Label>
            <div className="items-center col-span-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button className="w-full" variant="outline">
                    {(startDate || endDate) && (
                      <CalendarDaysIcon className="mr-2 h-4 w-4" />
                    )}
                    <span>
                      {[
                        startDate ? formatDate(startDate) : null,
                        endDate ? formatDate(endDate) : null,
                      ]
                        .filter(Boolean)
                        .join(" - ") || "Кликни сюда чтобы выбрать дату"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <Calendar
                    mode="range"
                    onSelect={onDateRangeChange}
                    selected={{
                      from: convertDate(startDate),
                      to: convertDate(endDate),
                    }}
                    disabled={{
                      after: openTo,
                      before: new Date() > openFrom ? new Date() : openFrom,
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right" htmlFor="end-date">
              Промежуток времени (от\до)
            </Label>
            <div className="grid grid-cols-2 items-center gap-2 col-span-2">
              <Select onValueChange={setStartTime} value={startTime}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="9:00" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Array.from({ length: 11 * 4 }, (_, i) => {
                      const hour = (8 + Math.floor(i / 4))
                        .toString()
                        .padStart(2, "0");
                      const min = ((i % 4) * 15).toString().padStart(2, "0");
                      return (
                        <SelectItem
                          key={`${hour}:${min}`}
                          value={`${hour}:${min}`}
                        >
                          {hour}:{min}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select onValueChange={setEndTime} value={endTime}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="12:00" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Array.from({ length: 11 * 4 + 1 }, (_, i) => {
                      const hour = (8 + Math.floor(i / 4))
                        .toString()
                        .padStart(2, "0");
                      const min = ((i % 4) * 15).toString().padStart(2, "0");
                      return (
                        <SelectItem
                          key={`${hour}:${min}`}
                          value={`${hour}:${min}`}
                        >
                          {hour}:{min}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {timeSlotsToRender && (
          <div className={"overflow-y-scroll max-h-[30vh]"}>
            <DialogDescription>
              <b>
                На выбранные промежутки времени прямо сейчас доступны термины!
              </b>{" "}
              Это значит что как только начнётся процесс поиска, бот займёт
              первый их ниже преведённых слотов. Тут можно даже сразу кликнуть и
              записаться, но возможно пока ты клипал глазками, их уже кто-то
              отхапал. Всё таки мы тут не чёрной магией не занимаемся и не можем
              обновлять их в реальном времени.
            </DialogDescription>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">День</TableHead>
                  <TableHead>Слоты</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{timeSlotsToRender}</TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <div>
            <Button variant="ghost" onClick={handleClose}>
              Отменить
            </Button>
          </div>
          <Button
            className={"text-white"}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Начать!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CalendarDaysIcon(props) {
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
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}
