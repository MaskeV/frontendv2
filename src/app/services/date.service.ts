import { Injectable } from '@angular/core';
import { Datesetter } from '../models/dateSetter';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DateService {

  private refreshSubject = new Subject<void>();
  public refresh$ = this.refreshSubject.asObservable();

  constructor() { }

  public dateSubject = new BehaviorSubject<Datesetter>(new Datesetter());
  private activeComponentSubject = new BehaviorSubject<string | null>(null);

  date$ = this.dateSubject.asObservable();
  activeComponent$ = this.activeComponentSubject.asObservable();


  private downloadOptionSource = new BehaviorSubject<string | null>(null);
  currentDownloadOption = this.downloadOptionSource.asObservable();

  private triggerSubject = new BehaviorSubject<void>(undefined);
  trigger$ = this.triggerSubject.asObservable();


  setDate(dates: Datesetter) {
    this.dateSubject.next(dates);
  }
  setDateForRefresh(dates: Datesetter) {
    this.dateSubject.next(dates);
  }

  changeDownloadOption(option: string) {
    this.downloadOptionSource.next(option);
  }
  triggerFunctionCall() {
    this.triggerSubject.next();
  }

  triggerFunctionCall1() {
  this.refreshSubject.next();
}


  setActiveComponent(componentId: string) {
    this.activeComponentSubject.next(componentId);
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /** Return datetime string compatible with `datetime-local` input */
  getDateForInput(date: Date): string {
    if (!date) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
