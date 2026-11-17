import { HttpInterceptorFn, HttpParams } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { environment } from '../environments/environment';
import * as forge from 'node-forge';

export const EncryptionInterceptor: HttpInterceptorFn = (req, next) => {
  const ENABLE_ENCRYPTION = environment.encryptionEnabled;

  if (!ENABLE_ENCRYPTION) {
    const bypassReq = req.clone({
      setHeaders: { 'X-Encryption-Bypass': 'true' }
    });
    return next(bypassReq);
  }


  const token = sessionStorage.getItem('token');
  if (req.url.includes('/assets')) {
    return next(req);
  }

  return from(encryptRequest(req, token)).pipe(
    switchMap(encryptedReq => next(encryptedReq))
  );
};

async function encryptRequest(req: any, token: string | null) {
  try {
    const key = await getCryptoKey(token);
    let request = req.clone({ responseType: 'text' });

    if (req.params.keys().length > 0) {
      let queryParts: string[] = [];
      req.params.keys().forEach((paramKey: any) => {
        const values = req.params.getAll(paramKey);
        values?.forEach((val: any) => {
          queryParts.push(`${encodeURIComponent(paramKey)}=${encodeURIComponent(val)}`);
        });
      });
      
      const queryString = queryParts.join('&');
      const encryptedParams = await encryptData(queryString, key);

      request = request.clone({
        params: new HttpParams().set('_e', encryptedParams)
      });
    }

    if (req.body) {
      const jsonString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const encryptedBody = await encryptData(jsonString, key);
      
      request = request.clone({
        body: encryptedBody,
        setHeaders: {
          'Content-Type': 'text/plain'
        }
      });
    }

    return request;
  } catch (error) {
    console.error('EncryptionInterceptor: Encryption failed', error);
    return req;
  }
}

async function getCryptoKey(token: string | null): Promise<string> {
  const keySource = token || environment.encryptionKey;
  const md = forge.md.sha256.create();
  md.update(keySource, 'utf8');
  return md.digest().getBytes();
}

async function encryptData(data: string, key: string): Promise<string> {
  const iv = forge.random.getBytesSync(12);
  const cipher = forge.cipher.createCipher('AES-GCM', key);
  cipher.start({ iv: iv });
  cipher.update(forge.util.createBuffer(data, 'utf8'));
  cipher.finish();

  const encrypted = cipher.output.getBytes();
  const tag = cipher.mode.tag.getBytes();

  const combined = iv + encrypted + tag;
  return forge.util.encode64(combined);
}
