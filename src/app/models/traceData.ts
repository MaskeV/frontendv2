export class Span {
    endpointName?: string;
    serviceCode?: string;
    parentSpanId?: number | string;
    segmentId?: string;
    label?: string;
    layer?: string;
    spanId?: number | string;
    traceId?: string;
    type?: string;
    peer?: string;
    component?: string;
    isError?: boolean;
    isBroken?: boolean;
    refs?: Array<Ref>;
    startTime?: number;
    endTime?: number;
    dur?: number;
    children?: Span[];
    tags?: Array<any>;
    logs?: log[];
    parentSegmentId?: string;
    serviceInstanceName?:string;
    attachedEvents?:Array<any>;
  }

  export interface log {
    time: number;
    data: Map<string, string>;
  }
  
  export interface Ref {
    traceId: string;
    parentSegmentId: string;
    parentSpanId: number;
    type: string;
  }