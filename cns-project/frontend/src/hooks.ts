import { useEffect, useState } from 'react';
import { getNodes, getCluster, getHistory } from './api';

export const useNodes = (interval: number) => {
  const [nodes, setNodes]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const nodesData = await getNodes();
        
        // Para cada nodo, traer la última métrica
        const nodesConMetricas = await Promise.all(
          nodesData.map(async (node: any) => {
            try {
              const history = await getHistory(node.nodeId);
              const ultima = history[0]; // la más reciente
              return { ...node, ...ultima };
            } catch {
              return node;
            }
          })
        );
        
        setNodes(nodesConMetricas);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    const id = setInterval(fetchAll, interval);
    return () => clearInterval(id);
  }, [interval]);

  return { nodes, loading };
};

export const useCluster = (interval: number) => {
  const [cluster, setCluster] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      try { setCluster(await getCluster()); } catch {}
    };
    fetch();
    const id = setInterval(fetch, interval);
    return () => clearInterval(id);
  }, [interval]);

  return cluster;
};

export const useHistory = (nodeId: string) => {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!nodeId) return;
    getHistory(nodeId).then(setHistory).catch(() => {});
  }, [nodeId]);

  return history;
};