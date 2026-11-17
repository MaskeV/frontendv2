import { InfraApm } from "./infra-apm";
import { NetworkMap } from "./NetworkMap";
import { Session } from "./session";
import { SubFeatureMaster } from "./subFeatureMaster";

export class Role {
  User = 'User';
  Admin = 'Admin';
  id: any;
  subFeature!: SubFeatureMaster[];
  createdBy: any;
  editedBy: any;
  featuresList: any;
  subFeatureList: any;
  roleName!: string;
  roleDescription!: string;
  subfeaturesListRole: any;
  dataDiscoverConfigs: any;
  applicationId: any;
  featureId: any;
  sessionDTO: Session = new Session();
  infraApmList!: InfraApm[]
  networkData!: NetworkMap[];
  networkList!: NetworkMap[];
  description: any
  infraApmList1: any;
  infraApmList2: any;
}

export type Product = string;

export const PRODUCTS: Product[] = [];

export type FeatureComponent = string;

export const FEATURES: FeatureComponent[] = [];