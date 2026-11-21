// Shared formatting for web and API responses. Times travel as minutes
// from midnight (an integer), dates as YYYY-MM-DD strings.
export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export const fmtTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60 === 30 ? "30" : "00";
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m} ${ap}`;
};

export const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// Court hours: first start 6:00 AM, last start 9:00 PM, one hour a booking.
export const OPEN_MIN = 360;
export const LAST_START_MIN = 1260;
export const SLOT_STEP = 30;
export const BOOKING_LEN = 60;

export const allStarts = () => {
  const out: number[] = [];
  for (let t = OPEN_MIN; t <= LAST_START_MIN; t += SLOT_STEP) out.push(t);
  return out;
};
