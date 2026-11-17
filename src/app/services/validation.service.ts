import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class ValidationService {

  constructor() { }


  validateAlphabets(text: string): boolean {

    const regex = /^[a-z]*$/;
    if (text !== "" || text !== undefined || text !== null) {
      if (regex.test(text)) {
        return true;
      }
      else {
        return false;
      }
    }
    else {
      return false;
    }


  }

  validateZeroNumber(text: number) {
    if (text !== 0) {
      return true;
    }
    else {
      return false;
    }
  }
  validateNumber(text: string): boolean {

    const regex = /^[0-9]*$/;
    if (text !== "" || text !== undefined || text !== null) {
      if (regex.test(text)) {
        return true;
      }
      else {
        return false;
      }
    }
    else {
      return false;
    }


  }

  validateRange(min: number, max: number, text: number) {
    if (text !== 0 || text !== undefined || text !== null) {

      if (text < min || text > max) {
        return false;
      }
      else {
        return true;
      }

    }
    else {
      return false;
    }
  }

  validateAlphaNumeric(text: string): boolean {

    const regex = /^[a-zA-Z0-9]+$/;
    if (text !== "" || text !== undefined || text !== null) {
      if (regex.test(text)) {
        return true;
      }
      else {
        return false;
      }
    }
    else {
      return false;
    }

  }

  validateAlphaNumericCharacter(text: string, character: any): boolean {
    const regex = /^[a-zA-Z0-9]+$/;

    return false;
  }

  validateEmail(text: string): boolean {

    const regex = /^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$/;
    if (text !== "" || text !== undefined || text !== null) {
      if (regex.test(text)) {
        return true;
      }
      else {
        return false;
      }
    }
    else {
      return false;
    }

  }

  validateMultipleEmails(text: string): boolean {
    const regex = /^(([a-z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)(\s*(,)\s*|\s*$))*$/;
    if (text !== "" || text !== undefined || text !== null) {
      if (regex.test(text)) {
        return true;
      }
      else {
        return false;
      }
    }
    else {
      return false;
    }

  }

  validateMobileNumber(text: string): boolean {
    const regex = /^\d{10}$/;
    if (text !== "" || text !== undefined || text !== null) {
      if (regex.test(text)) {
        return true;
      }
      else {
        return false;
      }
    }
    else {
      return false;
    }

  }

  validateIP(text: string): boolean {
    const regex = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;
    if (text !== "" || text !== undefined || text !== null) {
      if (regex.test(text)) {
        return true;
      }
      else {
        return false;
      }
    }
    else {
      return false;
    }

  }

  validatePort(text: string): boolean {
    const regex = /^[0-9]*$/;
    if (text !== "" || text !== undefined || text !== null) {
      if (regex.test(text)) {
        return true;
      }
      else {
        return false;
      }
    }
    else {
      return false;
    }

  }

  validateNullUndefinedEmptyString(text: any): boolean {

    if (text === "" || text === undefined || text === null) {
      return true;
    }
    return false;
  }


}
