import { Session } from "./session";

export class AuthenticationUser {
    userId:any
    userName: any;
    password: any;
    token: any;
    passwordOTP: any;
    sessionDTO: Session = new Session();
}