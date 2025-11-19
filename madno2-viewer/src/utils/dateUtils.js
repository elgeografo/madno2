import { H3_RES } from '../config/constants';

export const pad2 = (n) => String(n).padStart(2, '0');

export const buildFileName = ({ year, month, day, hour, res = H3_RES, ext = 'csv' }) =>
  `points_${year}${pad2(month)}${pad2(day)}_${pad2(hour)}_res${res}.${ext}`;

export const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
