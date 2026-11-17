import { Session } from "./session";

export class InfraGroup {
    id:number;
    groupName:string='';
    hostGroup:string='';
    description:string='';
    infraType:string='LINUX';
    createdBy:number;
    updatedBy:number;
    createdOn:string;
    updatedOn:string;
    sessionDTO: Session;
}
