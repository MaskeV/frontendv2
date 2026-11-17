export class InfraAlertConfig{
    featureName:string="Infra";
    emailId:string;
    serviceId:string;
    isActive:boolean=false;
    static cloneConfig(alertConfig:InfraAlertConfig){
        let infraAlertConfigClone=new InfraAlertConfig();
        infraAlertConfigClone.emailId=alertConfig.emailId;
        infraAlertConfigClone.serviceId=alertConfig.serviceId;
        infraAlertConfigClone.isActive=alertConfig.isActive;
        return infraAlertConfigClone;
    }
}