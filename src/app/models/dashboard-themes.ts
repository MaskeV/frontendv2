import { Session } from "./session";

export class DashboardThemes {
    themeName:String;
    dasboardBgColor:string;
    widgetBgColor:string;
    widgetFontColor:String;
    widgetHeaderBgColor:String;
    widgetHeaderFontColor:String;
    widgetLoaderColor:string;
    userID:String;
    portalUserId:String;
    sessionDTO: Session = new Session();
    userId : any;
}
