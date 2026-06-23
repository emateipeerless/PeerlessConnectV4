import type { AnalogMapping, BitMapping, EventTimestampMapping, RtuBitMapping, ScalarMetricMapping } from '../../registerUtils';

export const DIESEL_ALARM_BITS: BitMapping[] = [
  { label: 'AC Power On', reg: '1800', bit: 0, okWhenActive: true },
  { label: 'Main Switch in OFF', reg: '1800', bit: 1 },
  { label: 'Auto Shutdown Disabled', reg: '1800', bit: 2, okWhenActive: true },
  { label: 'Manual Start', reg: '1800', bit: 3 },
  { label: 'Engine Coolant Temp High', reg: '1800', bit: 6 },
  { label: 'Engine Running', reg: '2011', bit: 4, okWhenActive: true },
  { label: 'Low Suction Pressure', reg: '2011', bit: 8 },
  { label: 'Engine Overspeed', reg: '2011', bit: 9 },
  { label: 'Engine Failed to Start', reg: '2011', bit: 11 },
  { label: 'System Discharge Pressure Low', reg: '2012', bit: 0 },
  { label: 'Battery #1 Trouble', reg: '2013', bit: 0 },
  { label: 'Battery #2 Trouble', reg: '2013', bit: 1 },
  { label: 'Common Trouble Alarm', reg: '2013', bit: 2 },
  { label: 'Engine at ECM', reg: '2013', bit: 7 },
  { label: 'Fuel Injector Malfunction', reg: '2013', bit: 8 },
  { label: 'ECM Warning', reg: '2013', bit: 9 },
  { label: 'ECM Failure', reg: '2013', bit: 10 },
  { label: 'High Raw Water Flow', reg: '2013', bit: 11 },
  { label: 'Low Raw Water Flow', reg: '2013', bit: 12 },
  { label: 'Low Oil Pressure', reg: '2013', bit: 14 },
  { label: 'Charger #1 Failure', reg: '2014', bit: 12 },
  { label: 'Charger #2 Failure', reg: '2014', bit: 13 },
  { label: 'Water Reservoir Low', reg: '1003', bit: 1 },
  { label: 'Fuel Leak Sensor', reg: '1003', bit: 5 },
  { label: 'Low Fuel Level', reg: '1003', bit: 6 },
  { label: 'High Fuel Level', reg: '1003', bit: 7 },
  { label: 'Pump Room Trouble', reg: '1000', bit: 7 },
  { label: 'Engine Trouble', reg: '1000', bit: 8 },
  { label: 'Pump Room Temp Low', reg: '1001', bit: 12 },
];

export const DIESEL_TRENDING_ANALOGS: AnalogMapping[] = [
  { label: 'System Discharge Pressure', reg: '2006', unit: 'PSI', decimals: 1 },
];

export const DIESEL_HISTORICAL_ANALOGS: AnalogMapping[] = [
  { label: 'Battery #1 Volts', reg: '2000', unit: 'V', decimals: 1 },
  { label: 'Battery #2 Volts', reg: '2001', unit: 'V', decimals: 1 },
  { label: 'Battery #1 Amps', reg: '2003', unit: 'A', decimals: 1 },
  { label: 'Battery #2 Amps', reg: '2004', unit: 'A', decimals: 1 },
];

export const DIESEL_HISTORICAL_METRICS: ScalarMetricMapping[] = [
  { label: 'Start Pressure Setting', reg: '3028', unit: 'PSI', decimals: 0, scale: 1 },
  { label: 'Stop Pressure Setting', reg: '3029', unit: 'PSI', decimals: 0, scale: 1 },
  { label: 'Calls to Start', reg: '1803', unit: '', decimals: 0, scale: 1 },
  { label: 'Number of Starts', reg: '2015', unit: '', decimals: 0, scale: 1 },
  { label: 'Seq Start Delay Setting', reg: '1802', unit: 's', decimals: 0, scale: 1 },
  { label: 'Min Run Time Setting', reg: '1808', unit: 's', decimals: 0, scale: 1 },
];

export const DIESEL_HISTORICAL_EVENTS: EventTimestampMapping[] = [
  { label: 'Last Engine Start', hour: '1856', minute: '1857', second: '1858', month: '1859', day: '1860', year: '1861' },
  { label: 'Last Engine High Temp', hour: '1834', minute: '1835', second: '1836', month: '1837', day: '1838', year: '1839' },
  { label: 'Last Charger Failure', hour: '1816', minute: '1817', second: '1818', month: '1819', day: '1820', year: '1821' },
  { label: 'Last Engine Low Oil Pressure', hour: '1840', minute: '1841', second: '1842', month: '1843', day: '1844', year: '1845' },
  { label: 'Last Low Fuel Level', hour: '1828', minute: '1829', second: '1830', month: '1831', day: '1832', year: '1833' },
  { label: 'Last Battery Trouble', hour: '1822', minute: '1823', second: '1824', month: '1825', day: '1826', year: '1827' },
  { label: 'Last Engine Overspeed', hour: '1810', minute: '1811', second: '1812', month: '1813', day: '1814', year: '1815' },
];

export const FCJC_DISCHARGE_REG = '18';
export const FCJC_STATUS_REG = '12';
/** Jockey stop / start pressure settings (PSI, whole number per FCJC map) */
export const FCJC_STOP_PRESSURE_REG = '1';
export const FCJC_START_PRESSURE_REG = '2';
/** Jockey total run hours — reg 6 (LONG); display value = raw ÷ 100 (e.g. 1890 → 18.90 h) */
export const FCJC_RUN_HOURS_REG = '6';
export const FCJC_RUN_HOURS_SCALE = 100;
/** Jockey starts — reg 8 (LONG, may use reg 9 as high word) */
export const FCJC_STARTS_REG = '8';
export const FCJC_STARTS_HIGH_REG = '9';

export const FCJC_MAIN_SWITCH_BITS = {
  auto: { reg: '2012', bit: 10 },
  manual: { reg: '2012', bit: 11 },
  off: { reg: '1800', bit: 1 },
} as const;

export const FCJC_SWITCH_BITS = { auto: 2, manual: 3 } as const;

export const FCJC_STATUS_BITS: RtuBitMapping[] = [
  { label: 'Discharge Transducer Fault', bit: 0 },
  { label: 'Suction Transducer Fault', bit: 1 },
  { label: 'Jockey Pump Running', bit: 5, okWhenActive: true },
  { label: 'Jockey Over Pressure', bit: 7 },
  { label: 'Jockey Failed to Start', bit: 8 },
  { label: 'Jockey Excessive Starts', bit: 9 },
  { label: 'Jockey Common Trouble', bit: 10 },
  { label: 'Low Suction Pressure', bit: 11 },
  { label: 'Low Fuel', bit: 12 },
  { label: 'Fuel Transducer Fault', bit: 13 },
  { label: 'Jockey Power Available', bit: 15, okWhenActive: true },
];

export const DIESEL_LOW_PRESSURE_ALARM_ID = 'system-discharge-pressure-low';
