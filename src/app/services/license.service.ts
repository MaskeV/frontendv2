import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LicenseService {

  private baseUrl = environment.baseUrl;
  private baseUrl2 = environment.baseUrl;
  // private baseUrl2 = 'http://localhost:8081';

  constructor(private http: HttpClient) { }

  public getLicenseUnitsUsed() {
    return this.http.get(`${this.baseUrl}` + "/user/api/getLicenseUnitsUsed");
  }

  public getLicenseDetails() {
    return this.http.get(`${this.baseUrl}` + "/user/api/getLicenseDetails");
  }

  public activateLicense(licenseString: string) {
    return this.http.post(`${this.baseUrl}/user/api/activateLicense`, { licenseString: licenseString });
  }

  public getLicenseDates() {
    return this.http.get(`${this.baseUrl}` + "/user/api/getLicenseDates");
  }

  // GENERATE LICENSE API

  public getAllLicensesDetails() {
    return this.http.get(`${this.baseUrl2}` + "/admin/license/getAllLicensesDetails");
  }

  public generateLicense(payload: any) {
    return this.http.post(`${this.baseUrl2}/admin/license/generateLicense`, payload);
  }

  public generateLicenseWithID(licenseId: number, payload: any) {
    const params = new HttpParams().set('licenseId', licenseId.toString());
    return this.http.post(`${this.baseUrl2}/admin/license/generateLicenseWithID`, payload, {params});
  }

  public getLicenseFiles(licenseId: number) {
    return this.http.get(
      `${this.baseUrl2}/admin/license/getLicenseFiles?licenseId=${licenseId}`, { observe: 'response', responseType: 'blob' }
    );
  }

  public licenseFilesApi(licenseId: number) {
    window.open(
      `${this.baseUrl2}/admin/license/getLicenseFiles?licenseId=${licenseId}`,
      '_self'
    );
  }
}
