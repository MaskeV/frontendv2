import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../../services/loader.service';

export const LoaderInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const loaderService = inject(LoaderService);
  const skipUrls = ['/user/api/checkUserSession','/alert/api/checkAlertSent','/database/orchestrator/v1'];
  const shouldSkip = skipUrls.some(url => req.url.includes(url));

  if (!shouldSkip) {
    loaderService.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (!shouldSkip) {
        loaderService.hide();
      }
    })
  );
};
