import { IpAddressConfigurationMaster } from "./ip-address-configuration-master";

export class InfraApm {
    featureType:any;
    infraType:any;
    applicationId:any;
    ipAddressId:any
    allLinuxIpAddress:any
    allContainerIpAddress:any
    allApplications:any
    allLinuxApplications:any
    allConatinerApplications:any
    checked:boolean=false;
    applicationName!:string;
    allInfraIp!: IpAddressConfigurationMaster[];
}