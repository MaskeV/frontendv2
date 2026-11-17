import { SpanStep } from "./spn-step";

export interface TraceDetails {
  trace_id: string;
  steps: SpanStep[];
}