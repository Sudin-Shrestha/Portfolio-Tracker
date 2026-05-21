export interface NepseFeeBreakdown {
  broker: number;
  sebon: number;
  dp: number;
  total: number;
}

const SEBON_RATE = 0.00015;
const DP_CHARGE = 25;

const getBrokerRate = (amount: number): number => {
  if (amount <= 50_000) return 0.0036;
  if (amount <= 500_000) return 0.0033;
  if (amount <= 2_000_000) return 0.0031;
  if (amount <= 10_000_000) return 0.0027;
  return 0.0024;
};

const getMinBrokerCommission = (amount: number): number => {
  if (amount <= 0) return 0;
  return 10;
};

export const calculateNepseBuyFees = (amount: number): NepseFeeBreakdown => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { broker: 0, sebon: 0, dp: 0, total: 0 };
  }
  const brokerCalculated = amount * getBrokerRate(amount);
  const broker = Math.max(brokerCalculated, getMinBrokerCommission(amount));
  const sebon = amount * SEBON_RATE;
  const dp = DP_CHARGE;
  const total = broker + sebon + dp;
  return { broker, sebon, dp, total };
};
