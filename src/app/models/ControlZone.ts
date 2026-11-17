import { Session } from './session';

export class ControlGroupMapping {
    id?: number;
    appId!: number | null;
    networkId!: number | null;
    ipAddId!: number | null;
}

export class ControlGroup {
    id!: number;
    groupName!: string;
    description!: string;
    createdBy!: string;
    updatedBy!: string;
    createdOn!: string;
    updatedOn!: string;
    mappings: ControlGroupMapping[] = [];
    sessionDTO!: Session;
}

export type GroupingMode = 'GENERIC' | 'TECH_TYPE' | 'HOST' | 'NETWORK' | 'SRG';

export interface AppOption {
    applicationId: number;
    applicationName: string;
    ipAddressId?: number | null;
    ipAddress?: string;
    label?: string;
    technologyType?: string;
}

export interface HostOption {
    hostId: number;
    hostName: string;
}

export interface SubFeatureOption {
    subFeatureID: number;
    subFeatureName: string;
}

export interface SubRow {
    appId: number | null;
    appName: string;
    selectedAppIpKey: string;
    ipId: number | null;
    ipAddress: string;
    hostId: number | null;
    hostName: string;
    hostList: HostOption[];
    subFeatureID: number | null;
    subFeatureName: string;
    subFeatureList: SubFeatureOption[];
}

export interface GroupingRow {
    applicationType: string;
    applicationTechnologies: string[];
    showAppDropdown: boolean;
    showTechDropdown: boolean;
    appSearchText: string;
    techSearchText: string;
    mode: GroupingMode;
    technologyDisabled: boolean;
    loadingApps: boolean;
    availableTechnologies: string[];
    availableApplications: AppOption[];
    selectedApplications: string[];
    subRows: SubRow[];
}