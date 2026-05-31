import api from '../api/api';

export const startSession = async (machineQr) => {
  const response = await api.post('/sessions/start', {
    machine_qr: machineQr,
  });

  return response.data;
};
