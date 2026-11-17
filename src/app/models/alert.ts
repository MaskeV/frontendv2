import { Session } from "./session";

export class Alert {
   
    alertName: any;
    createdBy: any;
    createdOn: any;
    dataFromLast: any;
    alertDuration: any;
    emailAction: any;
    healthRule: any;
    ipAddress: any;
    isAlertEnable: any;
    isCritical: any;
    isWarning: any;
    ivrAction:any;
    kaizalaActionzz:any;
    level1MailId:any;
    level1MobileNumber:any;
    level2ElapsedTime: any;
    level2MailId:any;
    level2MobileNumber:any;
    level3ElapsedTime:any;
    level3MailId:any;
    level3MobileNumber:any;
    serviceType!: string;
    smsAction:any;
    thresholdCriticalValue:any;
    thresholdWarningValue:any;
    triggerInterval:any;
    updatedBy:any;
    updatedOn:any;
    whatsAppAction:any;
    sessionDTO: Session = new Session();

}