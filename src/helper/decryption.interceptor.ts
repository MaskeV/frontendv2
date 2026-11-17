import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { from, of, switchMap } from 'rxjs';
import { environment } from '../environments/environment';
import * as forge from 'node-forge';

export const DecryptionInterceptor: HttpInterceptorFn = (req, next) => {
  const ENABLE_DECRYPTION = environment.encryptionEnabled;
  const token = sessionStorage.getItem('token');

  if (!ENABLE_DECRYPTION || req.url.includes('/assets')) {
    return next(req);
  }

  return next(req).pipe(
    switchMap(event => {
      if (event instanceof HttpResponse && typeof event.body === 'string' && event.body.trim().length > 0) {
        if(req.url.includes('/user/api/generateCaptcha')) {
          return from(decryptResponse(event, null));  
        } else {
          return from(decryptResponse(event, token));
        }
      }
      return of(event);
    })
  );
};

async function decryptResponse(event: HttpResponse<any>, token: string | null): Promise<HttpResponse<any>> {
  try {
    const key = await getCryptoKey(token);
    const decryptedJson = await decryptData(event.body, key);
    const parsedBody = JSON.parse(decryptedJson);
    return event.clone({ body: parsedBody });
  } catch (error) {
    console.error('DecryptionInterceptor: Decryption failed', error);
    return event;
  }
}

async function getCryptoKey(token: string | null): Promise<string> {
  const keySource = token || environment.encryptionKey;
  const md = forge.md.sha256.create();
  md.update(keySource, 'utf8');
  return md.digest().getBytes();
}

async function decryptData(base64Data: string, key: string): Promise<string> {
  const combined = forge.util.decode64(base64Data);

  const iv = combined.substring(0, 12);
  const encrypted = combined.substring(12, combined.length - 16);
  const tag = combined.substring(combined.length - 16);

  const decipher = forge.cipher.createDecipher('AES-GCM', key);
  decipher.start({ iv: iv, tag: forge.util.createBuffer(tag) });
  decipher.update(forge.util.createBuffer(encrypted));
  const pass = decipher.finish();
  
  if (pass) {
    return forge.util.decodeUtf8(decipher.output.getBytes());
  } else {
    throw new Error('Decryption authentication tag failed');
  }
}
