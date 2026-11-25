type ParsedProfileDate = {
  year: number;
  month: number | null;
  day: number | null;
};

export function parseProfileYear(value: string): number | null {
  const match = /(\d{4})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null;
}

function parseProfileDate(value: string): ParsedProfileDate | null {
  const normalized = value.trim();
  const year = parseProfileYear(normalized);
  if (year === null) return null;

  const monthDayMatch = /(?:\d{4})\D+(\d{1,2})(?:\D+(\d{1,2}))?/.exec(normalized);
  if (!monthDayMatch) {
    return { year, month: null, day: null };
  }

  const month = Number(monthDayMatch[1]);
  const day = monthDayMatch[2] === undefined ? null : Number(monthDayMatch[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { year, month: null, day: null };
  }
  if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) {
    return { year, month: null, day: null };
  }
  return { year, month, day };
}

function ageAt(birthday: ParsedProfileDate, reference: ParsedProfileDate): number {
  let age = reference.year - birthday.year;
  if (
    birthday.month !== null &&
    birthday.day !== null &&
    reference.month !== null &&
    reference.day !== null &&
    (reference.month < birthday.month ||
      (reference.month === birthday.month && reference.day < birthday.day))
  ) {
    age -= 1;
  }
  return age;
}

export function getActressAge(birthday: string, careerTo = '', now = new Date()): number | null {
  const parsed = parseProfileDate(birthday);
  if (!parsed) return null;
  const retiredAt = careerTo.trim() ? parseProfileDate(careerTo) : null;
  if (careerTo.trim() && !retiredAt) return null;
  const reference = retiredAt ?? {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
  const age = ageAt(parsed, reference);
  return age >= 0 ? age : null;
}

export function formatActressAge(birthday: string, careerTo = '', now = new Date()): string {
  const age = getActressAge(birthday, careerTo, now);
  return age === null ? '-' : `${age}岁`;
}

export function getActressCareerDuration(careerFrom: string, careerTo = '', now = new Date()): number | null {
  const startYear = parseProfileYear(careerFrom);
  if (startYear === null) return null;
  const endYear = careerTo.trim() ? parseProfileYear(careerTo) : now.getFullYear();
  if (endYear === null) return null;
  const duration = endYear - startYear;
  return duration >= 0 ? duration : null;
}

export function formatActressCareerDuration(careerFrom: string, careerTo = '', now = new Date()): string {
  const duration = getActressCareerDuration(careerFrom, careerTo, now);
  return duration === null ? '-' : `${duration}年`;
}
