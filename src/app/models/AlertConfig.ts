import { Session } from "./session";

export class AlertConfig {

    id: any;
    alertId: any;
    alertName: any;
    alertDurationId: any;
    triggerInterval: any;
    dataFromLast: any;
    isAlertEnable: any;
    thresholdWarningValue: any;
    thresholdCriticalValue: any;
    emailAction: any;
    smsAction: any;

    jiraAction: any;
    jiraToolId: any;
    assigneeId: any;
    assigneeName: any;
    issueType: any;

    whatsAppAction: any;
    kaizalaAction: any;
    ivrAction: any;
    level1MailId: any;
    level1MailTo?: string;
    level1MailCc?: string;
    level1MailBcc?: string;
    level1MobileNumber: any;
    level2ElapsedTime: any;
    level2MailId: any;
    level2MailTo?: string;
    level2MailCc?: string;
    level2MailBcc?: string;
    level2MobileNumber: any;
    level3ElapsedTime: any;
    level3MailId: any;
    level3MailTo?: string;
    level3MailCc?: string;
    level3MailBcc?: string;
    level3MobileNumber: any;
    createdOn: any;
    updatedOn: any;
    createdBy: any;
    updatedBy: any;
    escalationStartTime: any;
    applicationId: any;
    applicationName: any;
    applicationType: any;
    thresholdDataUnit: any;
    ruambotAgent: any;
    ruambotJob: any;
    sessionDTO: Session = new Session();
    currentThresholdBody: any;
    healthRuleId: any;
    evaluationType: string = 'IMMEDIATE';
    samplingWindowSize!: number | null;
    samplingBreachCount!: number | null;
    conBreachDuration!:number | null;
    status!:String
}