import winston from 'winston';

const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

const isDevelopment = 'development';

const getISTTimestamp = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 330);

  const datePart = now.toISOString().split('T')[0];
  const timePart = now.toISOString().split('T')[1].split('.')[0];
  return `${datePart} ${timePart}`;
};

const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    enumerateErrorFormat(),
    isDevelopment ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.splat(),
    // winston.format.timestamp(),
    winston.format.timestamp({ format: getISTTimestamp }), // Using IST timestamp
    winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`),
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

export default logger;
