const TZ = 'Asia/Tashkent';

function getNowInTimezone(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const weekdayShort = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);

  const dayMap = { Sun: 'sun', Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat' };
  const dayKey = dayMap[weekdayShort] || 'mon';
  return { dayKey, minutes: hour * 60 + minute };
}

function parseTimeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map((x) => Number(x));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function isOpenNow(openingHoursJson) {
  let hours;
  try {
    hours = typeof openingHoursJson === 'string' ? JSON.parse(openingHoursJson) : openingHoursJson;
  } catch {
    return { open: false, reason: 'invalid_hours' };
  }

  const { dayKey, minutes } = getNowInTimezone();
  const day = hours[dayKey];
  if (!day || day.open == null || day.close == null) {
    return { open: false, dayKey, reason: 'closed_today' };
  }

  const openM = parseTimeToMinutes(day.open);
  const closeM = parseTimeToMinutes(day.close);
  if (openM == null || closeM == null) {
    return { open: false, dayKey, reason: 'invalid_slot' };
  }

  const open = minutes >= openM && minutes < closeM;
  return { open, dayKey, opensNext: !open ? { open: day.open, close: day.close } : undefined };
}

module.exports = { isOpenNow, getNowInTimezone, TZ };
