import { Session } from "./session";
import { SubFeatureMaster } from "./subFeatureMaster";

export class Feature {

    id:any;
    applicationId:any;
    featureName:any;
    subFeatures:any;
    featureType:any;
    routeName:any;
    applicationName: any;
    createdBy:any;
    applicationNameClone: any;   
    applicationCloneid:any;
    nodeGraphId!: any[];
    subFeaturesClone:any;
    sessionDTO: Session = new Session();
}