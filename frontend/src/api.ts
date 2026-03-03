const BASE = '/api';

export const getNodes = async () => {
  const res = await fetch(`${BASE}/nodes`);
  return res.json();
};

export const getHistory = async (nodeId: string) => {
  const res = await fetch(`${BASE}/nodes/${nodeId}/history`);
  return res.json();
};

export const getCluster = async () => {
  const res = await fetch(`${BASE}/cluster`);
  return res.json();
};

export const getEvents = async () => {
  const res = await fetch(`${BASE}/events`);
  return res.json();
};

export const sendCommand = async (nodeId: string, message: string) => {
  const res = await fetch(`${BASE}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId, message }),
  });
  return res.json();
};
