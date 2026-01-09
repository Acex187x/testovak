/**
 * Типы данных для системы записи на экзамены
 */

/**
 * Информация о доступном тесте/экзамене
 */
export interface ExamTest {
  /** Название теста */
  title: string;
  /** Уникальный идентификатор теста */
  id: string;
  /** Ссылка на страницу теста */
  link: string;
  /** Дата начала доступности теста */
  openFrom: Date;
  /** Дата окончания доступности теста */
  openTo: Date;
  /** Доступен ли тест для записи */
  isAvailable: boolean;
  /** Список доступных дат для записи */
  availableDates: AvailableDate[];
}

/**
 * Доступная дата для записи на экзамен
 */
export interface AvailableDate {
  /** Дата в формате YYYY-MM-DD */
  parsedDate: string;
  /** Ссылка на страницу с временными слотами */
  link: string;
}

/**
 * Временной слот для записи на экзамен
 */
export interface TimeSlot {
  /** Ссылка для записи на данный слот */
  link: string;
  /** Дата и время слота */
  dateTime: Date;
}

/**
 * Конфигурация поиска экзамена
 */
export interface ExamSearchConfig {
  /** Дата начала поиска (формат YYYY-MM-DD) */
  startDate: string;
  /** Дата окончания поиска (формат YYYY-MM-DD), опционально */
  endDate?: string;
  /** Время начала диапазона (формат HH:MM) */
  startTime: string;
  /** Время окончания диапазона (формат HH:MM) */
  endTime: string;
  /** ID теста для поиска */
  testId: string;
  /** Время начала процесса поиска (timestamp) */
  runnerStartTime: number;
  /** Флаг активности поиска */
  isRunning: boolean;
}

/**
 * Результат поиска доступных дат
 */
export interface DateSearchResult {
  /** Найденные даты в пределах диапазона */
  matchingDates: AvailableDate[];
  /** Все отфильтрованные даты (±2 дня от диапазона) */
  filteredDates: AvailableDate[];
  /** Ссылка на найденную подходящую дату */
  foundDateLink: string | null;
}

/**
 * Распарсенные временные слоты для даты
 */
export interface ParsedTimesForDate {
  /** Дата в формате YYYY-MM-DD */
  date: string;
  /** Список доступных временных слотов */
  times: TimeSlot[];
}

/**
 * Состояние хранилища Chrome для поиска экзамена
 */
export interface ExamStorageState {
  isRunning: boolean;
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  testId: string;
  runnerStartTime: number;
}

/**
 * Форматированная информация о тесте для отображения
 */
export interface FormattedTestInfo {
  /** Название теста в кавычках */
  name: string;
  /** Диапазон дат */
  dateRange: string;
  /** Диапазон времени */
  timeRange: string;
}
