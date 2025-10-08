export enum AirQualityLevel {
  GOOD = "GOOD", // 0~50
  MODERATE = "MODERATE", // 51~100
  UNHEALTHY_SENSITIVE = "UNHEALTHY_SENSITIVE", // 101~150
  UNHEALTHY = "UNHEALTHY", // 151~200
  VERY_UNHEALTHY = "VERY_UNHEALTHY", // 201~300
  HAZARDOUS = "HAZARDOUS", // 301+
}
export interface AirQuality {
  description: string;
  quality: AirQualityLevel;
}
