import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class LoaderService {
    private requestCount = 0;

  private loaderSubject = new BehaviorSubject<boolean>(false);
  loader$ = this.loaderSubject.asObservable();

  /** For backward compatibility (old spinner listeners) */
  private spinner$ = new BehaviorSubject<'start' | 'stop'>('stop');

  getSpinnerObserver(): Observable<'start' | 'stop'> {
    return this.spinner$.asObservable();
  }

  /** Call when any API starts */
  show() {
    this.requestCount++;
    if (this.requestCount === 1) {
      this.loaderSubject.next(true);
      this.spinner$.next('start');
    }
  }

  /** Call when any API ends */
  hide() {
    if (this.requestCount === 0 || --this.requestCount === 0) {
      this.requestCount = 0;
      this.loaderSubject.next(false);
      this.spinner$.next('stop');
    }
  }

  /** Force stop everything */
  reset() {
    this.requestCount = 0;
    this.loaderSubject.next(false);
    this.spinner$.next('stop');
  }

  // === Backward compatibility for old code ===
  requestStarted() {
    this.show();
  }

  requestEnded() {
    this.hide();
  }

  resetSpinner() {
    this.reset();
  }

  
}
