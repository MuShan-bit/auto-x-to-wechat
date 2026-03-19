import { Logger } from '@nestjs/common';

type StructuredLogValue =
  | boolean
  | null
  | number
  | string
  | StructuredLogValue[]
  | {
      [key: string]: StructuredLogValue;
    };

export type StructuredLogFields = Record<string, StructuredLogValue>;

function serializeLogEntry(event: string, fields: StructuredLogFields) {
  return JSON.stringify({
    event,
    ...fields,
  });
}

export function createStructuredLogger(context: string) {
  const logger = new Logger(context);

  return {
    log(event: string, fields: StructuredLogFields = {}) {
      logger.log(serializeLogEntry(event, fields));
    },
    debug(event: string, fields: StructuredLogFields = {}) {
      logger.debug(serializeLogEntry(event, fields));
    },
    warn(event: string, fields: StructuredLogFields = {}) {
      logger.warn(serializeLogEntry(event, fields));
    },
    error(event: string, fields: StructuredLogFields = {}) {
      logger.error(serializeLogEntry(event, fields));
    },
  };
}
