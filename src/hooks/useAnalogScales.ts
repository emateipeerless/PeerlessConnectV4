import { useEffect, useMemo, useState } from 'react';
import { fetchAnalogScales } from '../api/client';
import { emptyScalingRows, parseTemplateId } from '../lib/analogScalesState';

export function useAnalogScales(deviceId: number) {
  const [templateId, setTemplateId] = useState('');
  const [scalingRows, setScalingRows] = useState(emptyScalingRows);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setLoadError(null);

    fetchAnalogScales(deviceId)
      .then((data) => {
        if (cancelled) return;

        setTemplateId(data.template !== null ? String(data.template) : '');
        setScalingRows(
          data.channels.map((channel) => ({
            adcMin: channel.adcMin !== null ? String(channel.adcMin) : '',
            adcMax: channel.adcMax !== null ? String(channel.adcMax) : '',
            valueMin: channel.valueMin !== null ? String(channel.valueMin) : '',
            valueMax: channel.valueMax !== null ? String(channel.valueMax) : '',
          })),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load analog scales';
        setLoadError(message);
        setTemplateId('');
        setScalingRows(emptyScalingRows());
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  const parsedTemplateId = useMemo(() => parseTemplateId(templateId), [templateId]);

  return {
    templateId,
    setTemplateId,
    scalingRows,
    setScalingRows,
    isLoading,
    loadError,
    parsedTemplateId,
  };
}

export type AnalogScalesState = ReturnType<typeof useAnalogScales>;
