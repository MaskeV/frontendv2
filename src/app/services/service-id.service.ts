import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ServiceIdService {

  constructor() { }

   private serviceIdSubject = new BehaviorSubject<string>('');
  serviceId$ = this.serviceIdSubject.asObservable();

  private encodedServiceId!: string;
  private s_id!: string;

  setServiceId(serviceId: string): void {
    this.encodedServiceId = btoa(serviceId)+ '.1';
    this.serviceIdSubject.next(this.encodedServiceId);
  }

  setServiceId2(serviceId: string): void {
    this.encodedServiceId = btoa(serviceId)
    this.serviceIdSubject.next(this.encodedServiceId);
  }

  getEncodedServiceId(): string {
    return this.encodedServiceId;
  }
}
