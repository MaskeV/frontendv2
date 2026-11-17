export interface MeteringMapping {
  zoneId: number;
  teamId: number;
  status: boolean;
}

export interface Report {
  id: number;
  reportName: string;
  description: string;
  createdBy: number;
  updatedBy: number | null;
  createdByName: string;
  updatedByName: string | null;
  createdOn: string;
  updatedOn: string | null;
  meteringMappings: MeteringMapping[];
}

export interface ReportApiResponse {
  serviceResponse: Report[];
  serviceStatus: string;
  serviceError: any;
  serviceMessage: string;
}


export interface ReportSchedulePayload {
  reportId: number;
  reportName:string;
  toEmails: string;
  scheduledTime: string; 
  status: boolean;
  createdBy: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  ccEmails?: string;
  scheduledDOW?: string;
  scheduledDOM?: number;

}