import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";
import { BehaviorSubject, Observable } from "rxjs";
import { User } from "../models/user";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Router } from '@angular/router';
import { AuthenticationUser } from "../models/authenticationUser";
import { DecoderService } from "./decoder.service";
import { StorageService } from "./storage.service";
import { ServiceResponse } from "../models/common/ServiceResponse";

@Injectable({ providedIn: 'root' })
export class AuthenticationService {

  private baseUrl = environment.baseUrl;
  private baseUrl2 = environment.baseUrl;
  // private baseUrl = 'http://localhost:12002';
  // private baseUrl2 = 'http://localhost:3000';

  private storage = inject(StorageService);

  private http = inject(HttpClient);
  private router = inject(Router);
  private decoderService = inject(DecoderService);

  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  user!: User;

  private currentSFIDSubject!: BehaviorSubject<number>;
  public currentSFID!: Observable<number>;

  constructor() {
    this.currentUserSubject = new BehaviorSubject<User | null>(
      this.storage.getItem('currentUser')
        ? <User>this.decoderService.decryptJson(JSON.parse(this.storage.getItem('currentUser')!))
        : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  setcurrentUserSubject(user: User) {
    this.currentUserSubject.next(user);
  }

  setToken(token: string): void {
    this.storage.setItem('token', token);
  }

  setRole(role: string): void {
    this.storage.setItem('role', role);
  }

  setUsername(username: string): void {
    this.storage.setItem('username', username);
  }

  // Removed setClientId to rely on currentUser object as single source of truth

  isLoggedIn() {
    return this.storage.getItem('token') != null;
  }
  getRole() {
    return this.storage.getItem('role');
  }

  getUserName() {
    return this.storage.getItem('username');
  }

  getToken() {
    return this.storage.getItem('token');
  }

  getClientId(): string | null {
    const userStr = this.storage.getItem('currentUser');
    if (!userStr) return null;
    try {
      const user = this.decoderService.decryptJson(JSON.parse(userStr));
      return user.clientId?.toString() || user.client_id?.toString() || user.clientid?.toString() || null;
    } catch (e) {
      return null;
    }
  }

  login(user: User): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}` + `/user/api/authenticateUser`, user);
  }

  logout(user: User) {
    // alert("userLogout 2")
    return this.http.post<User>(`${this.baseUrl}` + `/user/api/userLogout`, user);
  }

  // getAllPendingApproval(user: User) {
  //   return this.http.post<User>(`${this.baseUrl}` + '/user/api/admin/getpendingapprovaluser', user);
  // }

  getAllPendingApproval(user: User) {
    return this.http.post<User>(`${this.baseUrl}` + '/user/api/admin/getpendingapprovaluser', user);
  }

  approveUser(user: User) {
    return this.http.post<User>(`${this.baseUrl}` + '/user/api/admin/updateuseraproved', user);
  }


  // approveUser(user: User) {
  //   return this.http.post<User>(`${this.baseUrl}` + '/user/api/admin/updateuseraproved', user);
  // }

  rejectUser(approvalUserId: String, approverUserId: String, requestType: String): Observable<object> {
    return this.http.post(`${this.baseUrl}` + '/user/api/admin/updateuserrejected', { userid: approvalUserId, approver: approverUserId, request_type: requestType });
  }

  loginUserWithPreviousSession(user: User): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}` + `/user/api/authenticateUserWithPreviousSession`, user);
  }

  checkUserSession(user: AuthenticationUser) {
    return this.http.post<User>(`${this.baseUrl}` + `/user/api/checkUserSession`, user);
  }

  sendOTP(user: User) {
    return this.http.post<User>(`${this.baseUrl}` + `/user/api/sendOtp`, user);
  }

  confirmOtp(user: AuthenticationUser) {
    return this.http.post<User>(`${this.baseUrl}` + `/user/api/confirmOtp`, user);
  }

  changeForgottenPassword(user: AuthenticationUser) {
    return this.http.post<User>(`${this.baseUrl}` + `/user/api/changeForgottenPassword`, user);
  }

  validatePassword(user: AuthenticationUser) {
    return this.http.post<User>(`${this.baseUrl}` + `/user/api/validatePassword`, user);
  }

  updatePassword(user: AuthenticationUser) {
    return this.http.post<User>(`${this.baseUrl}` + `/user/api/updatePassword`, user);
  }

  setCurrentSFID(currentSFID: any): void {
    // this.currentSFIDSubject.next(currentSFID);
    this.currentSFIDSubject = new BehaviorSubject(currentSFID);
    this.currentSFID = this.currentSFIDSubject.asObservable();
    this.storage.setItem('currentSFID', currentSFID);
  }

  getCurrentSFID() {
    return this.storage.getItem('currentSFID');
  }

  // getClientId() {
  //   return this.currentUserValue?.clientId;
  // }

  getCrudMappingByUserTypeAndSubFeatureID(userID: any, sfID: any) {
    return this.http.post<User>(`${this.baseUrl}` + `/user/api/getCrudMappingByUserTypeAndSubFeatureID`
      , { userID: userID, subFeatureID: sfID });
  }

  authenticateGrafanaUser() {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
       
      })
    };
    return this.http.get<any>(`${this.baseUrl2}/api/dashboards/home`, httpOptions);
  }

  /* Check Flag Alert */
  getCheckFlagAlert(data: any) {
    let sessionDTO = data;
    return this.http.get<any>(`${this.baseUrl}` + `/user/api/getCheckFlagAlert`, { params: sessionDTO });
  }
  /* Application Logo */
  getApplicationLogo(data: any) {
    let sessionDTO = data;
    return this.http.get<any>(`${this.baseUrl}` + `/user/api/getApplicationLogo`, { params: sessionDTO });
  }

  /* Session TImer */
  getSessionTimeoutTimer(data: any) {
    // const params = new HttpParams().set('userId', userId);
    let sessionDTO = data;
    return this.http.get<any>(`${this.baseUrl}` + `/user/api/getSessionTimeoutTimer`, { params: sessionDTO });
  }

  generateCaptcha(width: number, height: number): Observable<ServiceResponse<any>> {
    // let params = new HttpParams()
    //   .set("width", width)
    //   .set("height", height)
    // return this.http.get<ServiceResponse<any>>(`${this.baseUrl}` + `/user/api/generateCaptcha`, { params });
    return this.http.get<ServiceResponse<any>>(`${this.baseUrl}` + `/user/api/generateCaptcha`);

  }
}

