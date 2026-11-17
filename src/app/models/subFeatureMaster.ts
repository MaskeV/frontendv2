import { Session } from "./session";

export class SubFeatureMaster {
    id: any = "";
    subFeatureName: any = "";
    applicationId: any;
    featureId: any;
    routeName: any = "";
    subFeatureId: any;
    allSubFeatureList: any;
    selectedProductList: any;
    featureType: any;
    appID: any;
    bgType: any;
    bgColor: any;
    bgURL: any;
    bgImageType: any;
    applicationName: any;
    featureName: any;
    subFeatures: any;
    subfeatureNameClone: any;
    sessionDTO: Session = new Session();
    imageFileName:any;
    image:any;
    hideTimepicker:any = "No";
    checked:boolean=false;
    subfeatueList!: SubFeatureMaster[];
}
