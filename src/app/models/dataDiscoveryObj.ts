import { Session } from "./session";

export class DataDiscoveryObj {

    indexName: any;
    fromDate: any;
    toDate: any;
    isTable!: string;
    pagination: boolean = false;
    paginationReferenceArray!: any[];
    updatedPitId!: string;
    numberOfDocuments!: number;
    search: boolean = false;
    searchKeyWord: string = "";
    elkId: any;
    sessionDTO: Session = new Session();
    kqlQuery:any;
    isQuerySearch:boolean = false;
    selectedFields: string[] = [];
}

export class DocumentOBJ{
    documentField:any;
    documentValue:any
}