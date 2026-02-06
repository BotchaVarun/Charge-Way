export interface EVModel {
  name: string;
  maxMileage: number;
  batteryCapacity: number;
}

export const EV_MODELS: EVModel[] = [
  { name: 'Tata Nexon EV', maxMileage: 312, batteryCapacity: 30.2 },
  { name: 'Tata Nexon EV Max', maxMileage: 437, batteryCapacity: 40.5 },
  { name: 'Tata Tiago EV', maxMileage: 315, batteryCapacity: 24 },
  { name: 'Tata Punch EV', maxMileage: 421, batteryCapacity: 35 },
  { name: 'MG ZS EV', maxMileage: 461, batteryCapacity: 50.3 },
  { name: 'MG Comet EV', maxMileage: 230, batteryCapacity: 17.3 },
  { name: 'Mahindra XUV400', maxMileage: 456, batteryCapacity: 39.4 },
  { name: 'Hyundai Ioniq 5', maxMileage: 631, batteryCapacity: 72.6 },
  { name: 'Kia EV6', maxMileage: 708, batteryCapacity: 77.4 },
  { name: 'BYD Atto 3', maxMileage: 521, batteryCapacity: 60.48 },
  { name: 'BYD e6', maxMileage: 415, batteryCapacity: 71.7 },
  { name: 'Mercedes EQS', maxMileage: 857, batteryCapacity: 107.8 },
  { name: 'BMW iX', maxMileage: 630, batteryCapacity: 76.6 },
  { name: 'Audi e-tron', maxMileage: 484, batteryCapacity: 71 },
  { name: 'Volvo XC40 Recharge', maxMileage: 418, batteryCapacity: 69 },
  { name: 'Custom / Other', maxMileage: 300, batteryCapacity: 40 },
];
