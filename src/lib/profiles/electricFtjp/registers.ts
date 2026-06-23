import type { AnalogMapping, BitMapping, EventTimestampMapping, RtuBitMapping, ScalarMetricMapping } from '../../registerUtils';

/** MK3 Electric alarm bits (mapping sheet). */
export const ELECTRIC_ALARM_BITS: BitMapping[] = [
  { label: 'Power On', reg: '2013', bit: 9, okWhenActive: true },
  { label: 'Under Voltage', reg: '1000', bit: 11 },
  { label: 'Over Voltage', reg: '1000', bit: 12 },
  { label: 'Isolating Switch OFF', reg: '1001', bit: 6 },
  { label: 'Low Pump Room Temp', reg: '1001', bit: 12 },
  { label: 'Auto Shutdown Disabled', reg: '1800', bit: 1, okWhenActive: true },
  { label: 'Under Frequency', reg: '1800', bit: 2 },
  { label: 'Over Frequency', reg: '1800', bit: 3 },
  { label: 'Motor Trouble', reg: '1002', bit: 0 },
  { label: 'Pump Room Trouble', reg: '1002', bit: 1 },
  { label: 'Low System Pressure', reg: '1801', bit: 1 },
  { label: 'Local Start', reg: '1801', bit: 3 },
  { label: 'Fail To Start', reg: '2011', bit: 11 },
  { label: 'Pump Running', reg: '2013', bit: 1, okWhenActive: true },
  { label: 'Phase Reversal', reg: '2013', bit: 4 },
  { label: 'Transfer Switch Normal', reg: '2013', bit: 7, okWhenActive: true },
  { label: 'Transfer Switch Emergency', reg: '2013', bit: 8 },
  { label: 'Phase Failure', reg: '1801', bit: 6 },
  { label: 'Deluge Valve Open', reg: '1801', bit: 2 },
  { label: 'Remote Start', reg: '1801', bit: 4 },
  { label: 'Interlock On', reg: '1801', bit: 5 },
  { label: 'Motor Overload', reg: '2013', bit: 2 },
];

export const ELECTRIC_TRENDING_ANALOGS: AnalogMapping[] = [
  { label: 'Discharge Pressure', reg: '2006', unit: 'PSI', decimals: 1 },
];

export const ELECTRIC_HISTORICAL_ANALOGS: AnalogMapping[] = [
  { label: 'Voltage Phase A', reg: '2000', unit: 'V', decimals: 0, scale: 1 },
  { label: 'Voltage Phase B', reg: '2001', unit: 'V', decimals: 0, scale: 1 },
  { label: 'Voltage Phase C', reg: '2002', unit: 'V', decimals: 0, scale: 1 },
  { label: 'Current Phase A', reg: '2003', unit: 'A', decimals: 0, scale: 1 },
  { label: 'Current Phase B', reg: '2004', unit: 'A', decimals: 0, scale: 1 },
  { label: 'Current Phase C', reg: '2005', unit: 'A', decimals: 0, scale: 1 },
  { label: 'Frequency', reg: '1813', unit: 'Hz', decimals: 1 },
];

export const ELECTRIC_HISTORICAL_METRICS: ScalarMetricMapping[] = [
  { label: 'Start Pressure', reg: '3028', unit: 'PSI', decimals: 0, scale: 1 },
  { label: 'Stop Pressure', reg: '3029', unit: 'PSI', decimals: 0, scale: 1 },
  { label: 'Motor Starts', reg: '2015', unit: '', decimals: 0, scale: 1 },
  { label: 'Sequential Start Timer', reg: '1811', unit: 's', decimals: 0, scale: 1 },
];

export const ELECTRIC_HISTORICAL_EVENTS: EventTimestampMapping[] = [
  { label: 'Last Pump Start', hour: '1867', minute: '1868', second: '1869', month: '1871', day: '1870', year: '1872' },
  { label: 'Last Phase Failure', hour: '1820', minute: '1821', second: '1822', month: '1823', day: '1824', year: '1825' },
  { label: 'Last Phase Reversal', hour: '1826', minute: '1827', second: '1828', month: '1829', day: '1830', year: '1831' },
  { label: 'Last Locked Rotor Trip', hour: '1832', minute: '1833', second: '1834', month: '1835', day: '1836', year: '1837' },
];

export const FTJP_DISCHARGE_REG = '27';
export const FTJP_STOP_PRESSURE_REG = '28';
export const FTJP_START_PRESSURE_REG = '29';
export const FTJP_SWITCH_REG = '25';
export const FTJP_STATUS_REG = '176';
export const FTJP_STARTS_REG = '84';
export const FTJP_RUN_HOURS_REG = '87';
export const FTJP_RUN_MINUTES_REG = '88';

export const FTJP_STATUS_BITS: RtuBitMapping[] = [
  { label: 'Jockey Power Available', bit: 0, okWhenActive: true },
  { label: 'Jockey Common Trouble', bit: 1 },
  { label: 'Jockey Pump Running', bit: 2, okWhenActive: true },
];

export const ELECTRIC_LOW_PRESSURE_ALARM_ID = 'low-system-pressure';
