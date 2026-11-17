import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SanitizationService {

  constructor() { }

  sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return input;
    }

    let clean = input;

    clean = clean.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    clean = clean.replace(/(javascript|vbscript)\s*:/gi, '');
    clean = clean.replace(/\s+on[a-z]+\s*=\s*(['"])(?:(?!\1)[\s\S])*\1/gi, '');
    clean = clean.replace(/\s+on[a-z]+\s*=\s*[^>\s]+/gi, '');
    clean = clean.replace(/<(iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, '');

    return clean;
  }

  sanitizePayload(payload: any): any {
    if (payload === null || payload === undefined) {
      return payload;
    }

    if (typeof payload === 'string') {
      return this.sanitizeInput(payload);
    }

    if (typeof payload !== 'object') {
      return payload;
    }

    if (payload instanceof Date || payload instanceof Blob || payload instanceof File || payload instanceof RegExp) {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map(item => this.sanitizePayload(item));
    }

    if (payload instanceof Map) {
      const sanitizedMap = new Map();
      payload.forEach((value, key) => {
        sanitizedMap.set(key, this.sanitizePayload(value));
      });
      return sanitizedMap;
    }

    if (payload instanceof Set) {
      const sanitizedSet = new Set();
      payload.forEach(value => {
        sanitizedSet.add(this.sanitizePayload(value));
      });
      return sanitizedSet;
    }

    const sanitizedObj: any = Object.create(Object.getPrototypeOf(payload) || Object.prototype);
    for (const key in payload) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        sanitizedObj[key] = this.sanitizePayload(payload[key]);
      }
    }

    return sanitizedObj;
  }
}
