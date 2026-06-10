import api from '../api/api';

export const getRewardHistory = async ({ skip = 0, limit = 1000 } = {}) => {
  const response = await api.get('/rewards/history', {
    params: { skip, limit },
  });

  return response.data;
};

export const redeemReward = async (rewardId) => {
  const response = await api.post(`/rewards/redeem/${encodeURIComponent(rewardId)}`);
  return response.data;
};
