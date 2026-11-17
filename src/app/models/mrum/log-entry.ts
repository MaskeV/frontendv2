export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  metadata: Record<string, any>;
  stackTrace?: any[];
}
