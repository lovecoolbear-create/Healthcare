export interface HealthStatus {
  level: 'normal' | 'low' | 'high' | 'very_low' | 'very_high';
  color: 'green' | 'yellow' | 'red';
  message: string;
}

export const evaluateBMI = (bmi: number, age: number): HealthStatus => {
  if (!bmi) return { level: 'normal', color: 'green', message: '' };
  
  let limits = { low: 18.5, high: 24.0, veryHigh: 28.0 };
  if (age >= 60) {
    limits = { low: 20.0, high: 26.0, veryHigh: 28.0 };
  }

  if (bmi < limits.low) return { level: 'low', color: 'yellow', message: '黄灯：低预警(消瘦)，建议增加营养摄入' };
  if (bmi < limits.high) return { level: 'normal', color: 'green', message: '绿灯：完美，请继续保持' };
  if (bmi < limits.veryHigh) return { level: 'high', color: 'yellow', message: '黄灯：高预警(超重)，属于“临界状态”，建议干预' };
  return { level: 'very_high', color: 'red', message: '提示：您的该项指标已显著超出临床安全范围，建议前往医院进行复查，遵医嘱调理' };
};

export const calculateBMI = (weightKg: number, heightCm: number) => {
  if (!weightKg || !heightCm) return 0;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
};

export const estimateBodyFat = (bmi: number, age: number, gender: string | number) => {
  if (!bmi || !age) return 0;
  const g = (gender === 'male' || gender === 1 || gender === '1') ? 1 : 0;
  return Number((1.20 * bmi + 0.23 * age - 10.8 * g - 5.4).toFixed(1));
};

export const evaluateBodyFat = (bf: number, age: number, gender: string | number): HealthStatus => {
  if (!bf) return { level: 'normal', color: 'green', message: '' };
  const g = (gender === 'male' || gender === 1 || gender === '1') ? 1 : 0;
  let limits = { low: 0, high: 0 };
  
  if (g === 1) {
    if (age >= 40) limits = { low: 11, high: 22 };
    else limits = { low: 8, high: 20 };
  } else {
    if (age >= 40) limits = { low: 23, high: 34 };
    else limits = { low: 21, high: 33 };
  }

  if (bf < limits.low) return { level: 'low', color: 'yellow', message: '黄灯：低预警，属于“轻度异常”，建议干预' };
  if (bf <= limits.high) return { level: 'normal', color: 'green', message: '绿灯：完美，请继续保持' };
  return { level: 'high', color: 'yellow', message: '黄灯：高预警，属于“临界状态”，建议干预' };
};

export const evaluateVisceralFat = (vf: number): HealthStatus => {
  if (!vf) return { level: 'normal', color: 'green', message: '' };
  if (vf >= 15) return { level: 'very_high', color: 'red', message: '提示：显著超出临床安全范围，建议前往医院进行复查，遵医嘱调理' };
  if (vf >= 10) return { level: 'high', color: 'yellow', message: '黄灯：高预警，属于“临界状态”，建议通过饮食、作息和运动进行干预' };
  return { level: 'normal', color: 'green', message: '绿灯：完美，请继续保持' };
};

export const evaluateBloodSugar = (bs: number, age: number): HealthStatus => {
  if (!bs) return { level: 'normal', color: 'green', message: '' };
  
  if (bs < 3.9) return { level: 'low', color: 'red', message: '提示：低于临床安全范围(头晕心悸风险)，建议前往医院进行复查' };
  
  if (age >= 60) {
    if (bs <= 7.0) return { level: 'normal', color: 'green', message: '绿灯：完美，请继续保持' };
    return { level: 'very_high', color: 'red', message: '提示：显著超出临床安全范围，建议前往医院进行复查，遵医嘱调理' };
  } else {
    if (bs <= 6.1) return { level: 'normal', color: 'green', message: '绿灯：完美，请继续保持' };
    if (bs < 7.0) return { level: 'high', color: 'yellow', message: '黄灯：高预警，属于“临界状态”，建议通过饮食、作息和运动进行干预' };
    return { level: 'very_high', color: 'red', message: '提示：显著超出临床安全范围，建议前往医院进行复查，遵医嘱调理' };
  }
};

export const evaluateTG = (tg: number): HealthStatus => {
  if (!tg) return { level: 'normal', color: 'green', message: '' };
  if (tg < 1.7) return { level: 'normal', color: 'green', message: '绿灯：完美，请继续保持' };
  return { level: 'high', color: 'yellow', message: '黄灯：高预警，属于“临界状态”，建议通过饮食和运动进行干预' };
};

export const evaluateLDLC = (ldlc: number, age: number, gender: string | number, hasHypertension = false): HealthStatus => {
  if (!ldlc) return { level: 'normal', color: 'green', message: '' };
  const g = (gender === 'male' || gender === 1 || gender === '1') ? 1 : 0;
  let threshold = 3.4;
  
  if (age >= 50 || hasHypertension) {
    threshold = 2.6;
  }

  if (ldlc < threshold) return { level: 'normal', color: 'green', message: '绿灯：完美，请继续保持' };
  
  if (g === 0 && age >= 50) {
    return { level: 'high', color: 'yellow', message: '黄灯：高预警，建议强烈通过运动和饮食膳食纤维进行干预' };
  }
  return { level: 'high', color: 'yellow', message: '黄灯：高预警，属于“临界状态”，建议通过饮食、作息和运动进行干预' };
};