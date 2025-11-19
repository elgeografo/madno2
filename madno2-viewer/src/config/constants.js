// ================== CONFIG ==================
export const H3_RES = 9;
export const DATA_BASE = '/data/madno2024';
export const ANIM_MS = 1000; // 1s por frame
// ===========================================

export const INITIAL_VIEW_STATE = {
  longitude: -3.7038,
  latitude: 40.4168,
  zoom: 10,
  pitch: 30,
  bearing: 0,
};

// Radio aproximado del hexágono H3 en metros
import { edgeLength, UNITS } from 'h3-js/legacy';
export const RADIUS_METERS = edgeLength(H3_RES, UNITS.m);
