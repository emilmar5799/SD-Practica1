import { useEffect, useState } from 'react';
import { getNodes, getCluster, getHistory } from './api';

export const useNodes = (interval: number) => {
  const [nodes, setNodes]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const nodesData = await getNodes();
        
        const nodesConMetricas = await Promise.all(
          nodesData.map(async (node: any) => {
            try {
              const history = await getHistory(node.nodeId);
              // agrupar las métricas más recientes por diskName
              const latestByDisk: Record<string, any> = {};
              history.forEach((m: any) => {
                if (!latestByDisk[m.diskName]) latestByDisk[m.diskName] = m;
              });
              const disks = Object.values(latestByDisk);
              // sumar totales
              const agg = disks.reduce((acc: any, m: any) => {
                acc.totalGB += m.totalGB || 0;
                acc.usedGB  += m.usedGB  || 0;
                acc.freeGB  += m.freeGB  || 0;
                acc.iops      = m.iops || acc.iops;
                // RAM y pctUse se consideran iguales para todos los discos
                acc.totalRAM = m.totalRAM || acc.totalRAM;
                acc.usedRAM  = m.usedRAM  || acc.usedRAM;
                return acc;
              }, { totalGB: 0, usedGB: 0, freeGB: 0, iops: 0, totalRAM: 0, usedRAM: 0 });
              agg.pctUse = agg.totalGB > 0 ? Math.round((agg.usedGB / agg.totalGB) * 100) : 0;
              return { ...node, ...agg, disks };
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