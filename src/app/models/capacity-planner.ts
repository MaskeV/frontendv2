import { Session } from "./session";

export class CapacityPlanner {
    ipaddress:any;
	fromDate:any;
	tillDate:any;
	cpuHealthData: any;
	memoryHealthData: any;
	diskHealthData:any;
  	applicationID: any;
  	dataSource: string | undefined;
	sessionDTO: Session = new Session();
}
