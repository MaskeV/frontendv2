import { Session } from "./session";
export class User {
    [x: string]: any;
    userId: any;
    fullName: any;
    mailId: any;
    password: any;
    token: any;
    role: any;
    roleId: any;
    roleName: any;
    authentication: any;
    approver: any;
    mobileNo: any;
    multiRole: any = null;
    themeColour: any;
    userType: any;
    id: any;
    created: any;
    salt: any;
    sessionLogout: any;
    sirenPath: any;
    enableFlashAlert: any;
    preferredSubfeature: any;
    sessionDTO: Session = new Session();
    isActive: any;
    createdDate: any;
    createdBy: any;
    updatedOn: any;
    updatedBy: any;
    secret!: string;
    subFeatures?: SubFeature[];
    tool: string = 'APM';
    count?: number;
    actualLockCount?: number;
    createdByUserName?: string;
    createdByUsername?: string;
    updatedByUserName?: string;
    updatedByUsername?: string;
    deletedOn?: string;
    createdOn?: any;
    approverName?: string;
    approvalDate?: string;
    clientId?: any;
    clientName?: any
    editedBy?: any;
    crudData?: any;
    captchaToken?: string;
    withPreviousSession?: boolean;
    captchaProvider?: string;
}

export interface SubFeature {
    name: string;
    routeName?: string;
    subFeatureID?: string;
    subFeature?: SubFeature[];
}
