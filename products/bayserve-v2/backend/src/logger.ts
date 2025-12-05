export const log = (level: 'INFO' | 'ERROR', message: string, meta?: Record<string, unknown>) => {
  const entry = {
    level,
    message,
    meta: meta || {},
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(entry));
};
