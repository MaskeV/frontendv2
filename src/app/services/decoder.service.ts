import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import * as forge from 'node-forge';

@Injectable({
  providedIn: 'root'
})
export class DecoderService {

  private secretKey = '877377FDCF8A2F01'; 
  private iv = '877377FDCF8A2F01'; 
  private gcmTagLength = 128;
  constructor() { }

  encryptJson(jsonData: any): any {
    if (jsonData !== null && typeof jsonData === 'object') {
      if (Array.isArray(jsonData)) {
        return jsonData.map(item => this.encryptJson(item));
      } else {
        const encryptedObj: any = {};
        for (const key in jsonData) {
          if (jsonData.hasOwnProperty(key)) {
            encryptedObj[key] = this.encryptJson(jsonData[key]);
          }
        }
        return encryptedObj;
      }
    } else if (jsonData !== null && jsonData !== undefined) {
      // Only encrypt valid primitive values
      const encrypted = CryptoJS.AES.encrypt(jsonData.toString(), this.secretKey).toString();
      return encrypted;
    } else {
      // Return null or undefined as is, without encrypting
      return jsonData;
    }
  }
  

  decryptJson(jsonData: any): any {
    if (jsonData !== null && typeof jsonData === 'object') {
      if (Array.isArray(jsonData)) {
        return jsonData.map(item => this.decryptJson(item));
      } else {
        const decryptedObj: any = {};
        for (const key in jsonData) {
          if (jsonData.hasOwnProperty(key)) {
            decryptedObj[key] = this.decryptJson(jsonData[key]);
          }
        }
        return decryptedObj;
      }
    } else {
      if (typeof jsonData === 'string') {
        try {
          const bytes = CryptoJS.AES.decrypt(jsonData, this.secretKey);
          const decrypted = bytes.toString(CryptoJS.enc.Utf8);
          return decrypted ? decrypted : jsonData;  // Return decrypted or original
        } catch (error) {
          // console.error('Decryption failed:', error);
          return jsonData;  // Return original if decryption fails
        }
      } else {
        return jsonData;  // Return as-is if not encrypted
      }
    }
  }

  // Convert a base64 string to ArrayBuffer
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Convert string to ArrayBuffer
  private stringToArrayBuffer(str: string): ArrayBuffer {
    return new TextEncoder().encode(str);
  }

  // AES decryption function
  async decryptAES2(encryptedBase64: string): Promise<string> {
    try {
      const encryptedData = this.base64ToArrayBuffer(encryptedBase64);
      const keyBuffer = this.stringToArrayBuffer(this.secretKey);
      const ivBuffer = this.stringToArrayBuffer(this.iv);

      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        cryptoKey,
        encryptedData
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      // console.error('Decryption failed', error);
      return encryptedBase64;
    }
  }

  async decryptAES(encryptedBase64: string): Promise<string> {
    try {
      const encryptedBytes = forge.util.decode64(encryptedBase64);
  
      // Split ciphertext and tag
      const tagLength = 16; // 128 bits => 16 bytes
      const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - tagLength);
      const tag = encryptedBytes.slice(encryptedBytes.length - tagLength);
  
      // Use fixed IV from backend
      const iv = forge.util.createBuffer(this.iv, 'utf8').getBytes();
      const keyBuffer = forge.util.createBuffer(this.secretKey, 'utf8').getBytes();
  
      const decipher = forge.cipher.createDecipher('AES-GCM', keyBuffer);
      decipher.start({
        iv: iv,
        tagLength: 128,
        tag: forge.util.createBuffer(tag),  // Provide the authentication tag separately
      });
  
      decipher.update(forge.util.createBuffer(ciphertext));
  
      const success = decipher.finish();
  
      if (success) {
        return decipher.output.toString();
      } else {
        // console.error('Decryption failed');
        return encryptedBase64;
      }
    } catch (error) {
      // console.error('Decryption error:', error);
      return encryptedBase64;
    }
  }

  async decodeObject(data: any): Promise<any> {
    if (typeof data === 'string') {
      return this.decryptAES(data);
    } else if (Array.isArray(data)) {
      return Promise.all(data.map(item => this.decodeObject(item)));
    } else if (data && typeof data === 'object') {
      const decodedObj: any = {};
      await Promise.all(Object.keys(data).map(async key => {
        decodedObj[key] = await this.decodeObject(data[key]);
      }));
      return decodedObj;
    }
    return data;
  }
}
