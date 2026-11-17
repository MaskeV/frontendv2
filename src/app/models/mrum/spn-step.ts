export interface SpanStep {
  name: string;
  id: string;
  parent_id: string | null;
  type: string;
  latencyMs: number;
  outcome: string;
  httpStatusCode?: number;
  metaData: { [key: string]: any };
}
