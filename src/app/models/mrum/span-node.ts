import { SpanStep } from "./spn-step";

export interface SpanNode extends SpanStep {
  children?: SpanNode[];
}