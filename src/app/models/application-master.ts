import { indexPattern } from "./indexPattern";
import { IpAddressConfigurationMaster } from "./ip-address-configuration-master";
import { Session } from "./session";

export class ApplicationMaster {
    appID: any;
    applicationID: any;
    applicationName: any;
    applicationType: any;
    techType: any;
    technologyType: any;
    technologyTypeId: any;
    createdBy: any;
    updatedBy: any;
    ipAddress!: IpAddressConfigurationMaster[];
    nodes!: string[];
    userId: any;
    applicationNewName: any;
    sessionDTO: Session = new Session();
    indexPatterns!: indexPattern[];
}
