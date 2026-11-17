import { Session } from "./session";

export class ImageDetails {
    id:any;
    imageId:any;
    imageName:any;
    imageTitle:any;
    applicationId:any;
    subFeatureId :any;
    isActive:string = 'yes';
    sessionDTO: Session = new Session();
}