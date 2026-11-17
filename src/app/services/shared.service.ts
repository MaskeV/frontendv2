// shared.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ServiceIdService } from './service-id.service';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  constructor (private serviceIdService : ServiceIdService){}
  private selectedEndpointSource = new BehaviorSubject<string | null>(null);
  selectedEndpoint$ = this.selectedEndpointSource.asObservable();

  private selectedInstanceSource = new BehaviorSubject<string | null>(null);
  selectedInstance$ = this.selectedInstanceSource.asObservable();

  private selectedTraceIdSource = new BehaviorSubject<string | null>(null);
  selectedTraceId$ = this.selectedTraceIdSource.asObservable();

  private selectedServiceSource = new BehaviorSubject<string | null>(null);
  selectedService$ = this.selectedServiceSource.asObservable();

  private selectedEndpointTraceIdSource = new BehaviorSubject<string | null>(null);
  selectedEndpointTraceId$ = this.selectedEndpointTraceIdSource.asObservable();

  private selectedInstanceTraceIdSource = new BehaviorSubject<string | null>(null);
  selectedInstanceTraceId$ = this.selectedInstanceTraceIdSource.asObservable();

  selectEndpoint(endpoint: string | null): void {
    this.selectedEndpointSource.next(endpoint);
  }

  selectInstance(instName: string | null): void {
    this.selectedInstanceSource.next(instName);
  }

  selectTraceId(traceId: string | null): void {
    this.selectedTraceIdSource.next(traceId);
  }

  setSelectedService(serviceName: string): void {
    this.selectedServiceSource.next(serviceName);
  }

  selectEndpointTraceId(traceID: string | null): void {
    this.selectedEndpointTraceIdSource.next(traceID);
  }

  selectInstanceTraceId(traceID: string | null): void {
    this.selectedInstanceTraceIdSource.next(traceID);
  }

  setServiceId(serviceName: string): void {
    this.serviceIdService.setServiceId(serviceName);
    sessionStorage.setItem('SelectedServiceId', serviceName);
    
    const encodedId = this.serviceIdService.getEncodedServiceId();
    sessionStorage.setItem('encodedEntityIDForServices', encodedId);
  }
}
