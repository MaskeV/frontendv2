import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { DevService } from '../app/services/dev.service';

export const JwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = sessionStorage.getItem('token');
  const devService = inject(DevService);

  const isDevelopment = false;  

  let request = req;

  if (token) {
    let headers = { Authorization: `Bearer ${token}` };
    
    let url = req.url;
    if (isDevelopment) {
      url = devService.alterURL(url);
    }

    request = req.clone({
      setHeaders: headers,
      url: url
    });
  }

  return next(request);
};
