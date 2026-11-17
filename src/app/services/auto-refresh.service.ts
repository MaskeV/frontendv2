import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AutoRefreshService {
private storageSub = new BehaviorSubject<{ key: string | null, value: string | null } | null>(null);
  private autoRefreshSubject = new BehaviorSubject<boolean>(this.getAutoRefreshState());

  constructor() {
    window.addEventListener('storage', (event) => {
      if (event.storageArea === localStorage) {
        this.storageSub.next({ key: event.key, value: event.newValue });
        if (event.key === 'RefreshEnability') {
          this.autoRefreshSubject.next(this.getAutoRefreshState());
        }
      }
    });
  }

  public setItems(key: string, value: any): void {
    localStorage.setItem(key, value);
    this.storageSub.next({ key, value });
    if (key === 'RefreshEnability') {
      this.autoRefreshSubject.next(this.getAutoRefreshState());
    }
  }

  getItem(key: string): string | null{
    return localStorage.getItem(key);
  }

  getStorageSub(): Observable<{ key: string, value: string }> {
  return this.storageSub.asObservable().pipe(
    filter((item): item is { key: string, value: string } => !!item && item.key !== null && item.value !== null)
  );
}

  getAutoRefreshState(): boolean {
    return JSON.parse(localStorage.getItem('RefreshEnability') || 'false');
  }

  get autoRefresh$(): Observable<boolean> {
    return this.autoRefreshSubject.asObservable();
  }
}
