import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { JwtInterceptor } from '../helper/jwt.interceptor';
import { EncryptionInterceptor } from '../helper/encryption.interceptor';
import { DecryptionInterceptor } from '../helper/decryption.interceptor';
import { provideHotToastConfig } from '@ngxpert/hot-toast';
import { text } from 'd3'; import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations';
import { NgxGaugeModule } from 'ngx-gauge';
import { LoaderInterceptor } from './utility/interceptors/loader.interceptor';
import { BsModalService } from 'ngx-bootstrap/modal';
import { RECAPTCHA_SETTINGS, RecaptchaSettings } from 'ng-recaptcha';
import { environment } from '../environments/environment';


export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch(), withInterceptors([JwtInterceptor, LoaderInterceptor, EncryptionInterceptor, DecryptionInterceptor])),
    provideAnimationsAsync(),
    importProvidersFrom(BrowserAnimationsModule, NgxGaugeModule),
    BsModalService,


    provideAnimationsAsync(),
    provideHotToastConfig({
      style: {
        background: 'var(--toast-bg-color)',
        color: 'var(--toast-color)',
        padding: '1rem',
        borderRadius: '5px',
      }
    }),
    {
      provide: RECAPTCHA_SETTINGS,
      useValue: {
        siteKey: environment.recaptchaSiteKey
      } as RecaptchaSettings,
    }
  ]
};