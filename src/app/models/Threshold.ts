import { Session } from "./session";

export class Threshold {
    [x: string]: any;
    module!: string;
    metricLabel?: string;
    threshold!: number;
    applicationID: any = 'Select';
    dataUnit: string = "";
    applicationType: any;
    healthRuleTypeID: any = "";
    thresholdMode: string = 'NORMAL_UNIT';
    units: string = "";
    displayUnit: string = "";
    baseline: string = "";
    technologyType: string = "";
    warningPercentage: any;
    criticalPercentage: any;


    sessionDTO: Session = new Session();
}



