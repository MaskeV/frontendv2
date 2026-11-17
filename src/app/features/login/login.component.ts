import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import moment from 'moment';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { first, takeUntil } from 'rxjs/operators';
import * as CryptoJS from 'crypto-js';
import { AuthenticationService } from '../../services/authentication.service';
import { DecoderService } from '../../services/decoder.service';
import { LogServiceService } from '../../services/log-service.service';
import { LoggerService } from '../../services/logger.service';
import { User } from '../../models/user';
import { Session } from '../../models/session';
import { AuthenticationUser } from '../../models/authenticationUser';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { v4 as uuidv4 } from 'uuid';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LicenseService } from '../../services/license.service';
import { RecaptchaComponent, RecaptchaFormsModule, RecaptchaModule } from 'ng-recaptcha';
import { environment } from '../../../environments/environment';
import { ServiceStatus } from '../../models/enums/ServiceStatus';
import { ServiceResponse } from '../../models/common/ServiceResponse';


@Component({
    selector: 'app-login',
    imports: [
        RecaptchaModule,
        RecaptchaFormsModule,
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  @ViewChild('loginModal', { static: true }) loginModal!: TemplateRef<any>;
  @ViewChild('captchaRef') captchaRef!: RecaptchaComponent;

  private storage = inject(StorageService);

  user: User = new User();
  userName: string = '';
  password: string = '';
  returnUrl: string = '';
  error: string = '';
  loginError: string = '';
  otpError: string = '';
  otpSuccess: string = '';
  encrypted: any;
  modalRef!: BsModalRef;
  todaysDate: string = moment().format('YYYY-MM-DD');
  authFlag: string = '';
  fieldTextType: boolean = false;
  fieldTextTypePassword: boolean = false;
  displayLoader: boolean = false;
  applicationLogo: string = '';
  isLoginUserForm: boolean = true;
  isAskingOtpForm: boolean = false;
  isNewPasswordForm: boolean = false;
  isUsernameForm: boolean = true;
  isOtpForm: boolean = false;
  isPasswordChangeForm: boolean = false;
  requestedOtp: string = '';
  newPassword: string = '';
  conformNewPassword: string = '';
  disablesendOTP: boolean = false;
  strongPasswordTip: string = "For strong password:  The password is at least 8 characters long, one uppercase letter, one lowercase letter, one digit, one special character.";
  loginTime: string = '';
  sessionObject: Session = new Session();
  emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  isEmailValid: boolean = false;
  emailError: string | null = null;
  otpEnabled = false;
  showPassword: boolean = false;
  recaptchaToken: string = '';
  captchaAnswer: string = '';
  captchaProvider: string = environment.captchaProvider;
  captchaImage: string = '';
  captchaId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthenticationService,
    private loggerService: LoggerService,
    private logger: LogServiceService,
    private decoderService: DecoderService,
    private licenseService: LicenseService,
  ) {
   
    if (this.authService.isLoggedIn()) {
      const postRedirect = this.storage.getItem('postLoginRedirect');
      this.router.navigateByUrl(postRedirect || '/service-page');
    }
  }

  ngOnInit(): void {
   
    window.addEventListener('pageshow', (event) => {
      if (event.persisted && this.authService.isLoggedIn()) {
        this.router.navigate(['/service-page']);
      }
    });

    this.sessionObject.featureName = "Login";
    this.sessionObject.loginTime = this.storage.getItem('loginTime');
    this.sessionObject.sessionId = this.storage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/service-page';
    this.logger.setPageName("Login Page");
    if (this.applicationLogo == null && this.applicationLogo == undefined) {
      this.authService.getApplicationLogo(this.sessionObject).pipe(first()).subscribe(response => {
        if (response.serviceResponse && response.serviceResponse != "null") {
          this.applicationLogo = response.serviceResponse;
        } else {
          this.applicationLogo = '';
        }
      });
    }
    if(this.captchaProvider === 'LOCAL') {
      this.generateCaptcha();
    }
  }

  reloadCaptcha() {
    if(this.captchaProvider==='RECAPTCHA'){
      this.captchaRef.reset();
    } else {
      this.captchaAnswer = '';
      this.captchaId = '';
      this.generateCaptcha();
    }
    this.recaptchaToken = '';
  }

  generateCaptcha( width: number = 250, height: number = 50) {
    this.authService.generateCaptcha(width, height).pipe(first()).subscribe({
      next: (response:ServiceResponse<any>) => {
        if(response?.serviceStatus === ServiceStatus.SUCCESS) {
          this.captchaImage = 'data:image/jpeg;base64,' + response?.serviceResponse?.image;
          this.captchaId = response?.serviceResponse?.captchaId;
        } else{
          this.captchaImage = '';
          this.loginError = "Something went wrong while generating CAPTCHA. Please try again.";
          this.showToast(this.loginError, 'error');
        }
      },
      error: (error) => {
        this.captchaImage = '';
        this.loginError = "Something went wrong while generating CAPTCHA. Please try again.";
        this.showToast(this.loginError, 'error');
      }
    });
  }

  private validateCaptcha(withPreviousSession: boolean): boolean {
    if (withPreviousSession) {
      return true;
    }
    if (this.captchaProvider === 'RECAPTCHA') {
        if (!this.recaptchaToken) {
          this.loginError = "Please complete the CAPTCHA challenge.";
          return false;
        }
      } else {
        if (!this.captchaAnswer || !this.captchaAnswer.trim()) {
          this.loginError = "Please provide the CAPTCHA answer.";
          return false;
        }
        this.recaptchaToken = this.captchaId + "$" +this.captchaAnswer;
      }
      return true;
  }


  validateEmail() {
    if (!this.userName || !this.emailRegex.test(this.userName)) {
      this.emailError = "Please enter a valid email address!";
      this.isEmailValid = false;
    } else {
      this.emailError = null;
      this.isEmailValid = true;
    }
  }

  sendOTP(): void {
    this.otpSuccess = '';
    this.otpError = '';

    if (!this.userName || !this.emailRegex.test(this.userName)) {
      this.otpError = "Please enter a valid email address!";
      return;
    }

    this.toggleOTPbutton('disable');

    const user = new User();
    user.userId = this.userName;
    this.sessionObject.userId = this.userName;
    user.sessionDTO = this.sessionObject;

    this.authService.sendOTP(user).pipe(first()).subscribe({
      next: (response) => {
        if (response['serviceStatus'] === "Success") {
          this.otpSuccess = response['serviceResponse'];
          this.isUsernameForm = false;
          this.isOtpForm = true;
          this.isPasswordChangeForm = false;
          this.isAskingOtpForm = false
        } else {
          this.otpError = response['serviceResponse'];
        }
        this.toggleOTPbutton('enable');
      },
      error: () => {
        this.otpError = "An error occurred while sending the OTP.";
        this.toggleOTPbutton('enable');
      }
    });
  }

  toggleOTPbutton(status: string) {
    this.otpEnabled = status === 'enable';
  }

  showEmailForm() {
    this.userName = "";
    this.isAskingOtpForm = true;
    this.isLoginUserForm = false;
    this.otpError = "";
  }

  openSignInForm() {
    let currentUrl = this.router.url;
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate([currentUrl]);

    this.userName = "";
    this.password = "";
    this.isLoginUserForm = true;
    this.isAskingOtpForm = false;
    this.otpSuccess = '';
    this.otpError = '';
    this.isUsernameForm = true;
    this.isOtpForm = false;
    this.isPasswordChangeForm = false;
    this.requestedOtp = '';
  }

  decryptEncryption(encryptedValue: string): string | null {
    try {
      const encryptedData = CryptoJS.enc.Base64.parse(encryptedValue);
      const encryptedBytes = encryptedData.words;

      const iv = CryptoJS.lib.WordArray.create(encryptedBytes.slice(0, 4));
      const ciphertext = CryptoJS.lib.WordArray.create(encryptedBytes.slice(4));

      const key = CryptoJS.enc.Utf8.parse("IjfgGhpOiLjbrtJf");

      const cipherParams = (CryptoJS as any).lib.CipherParams.create({
        ciphertext: ciphertext
      });

      const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return decrypted.toString(CryptoJS.enc.Utf8) || null;
    } catch (error) {
      return null;
    }
  }

  confirmOTP() {
    this.otpSuccess = '';
    this.otpError = '';
    if (this.requestedOtp == undefined || this.requestedOtp.trim() === "") {
      this.otpError = "Kindly enter the OTP";
      return;
    }
    const forgotPasswordUser = new AuthenticationUser();
    forgotPasswordUser.userId = this.userName;
    forgotPasswordUser.passwordOTP = this.requestedOtp;
    forgotPasswordUser.sessionDTO = this.sessionObject;

    this.authService.confirmOtp(forgotPasswordUser).pipe(first()).subscribe(
      (response) => {
        const responsestatus = this.decryptEncryption(response['serviceStatus']);
        if (responsestatus === null || responsestatus.trim() === "") {
          this.otpError = "Failed to decrypt the response. Please try again.";
          return;
        }
        if (responsestatus.trim() === "Success") {
          this.otpSuccess = response['serviceResponse'];
          this.isUsernameForm = false;
          this.isOtpForm = false;
          this.isPasswordChangeForm = true;
          this.newPassword = "";
          this.conformNewPassword = "";

          setTimeout(() => {
            this.otpSuccess = "";
          }, 3000);
        } else {
          this.otpError = response['serviceResponse'];
        }
      },
      (error) => {
        this.otpError = "Something went wrong. Please try again.";
      }
    );
  }

  changePassword() {
    this.otpSuccess = '';
    this.otpError = '';
    this.displayLoader = true;

    if (!this.newPassword || this.newPassword.trim() === '') {
      this.otpError = "Kindly provide New Password!!";
      this.displayLoader = false;
      return false;
    }

    if (!this.conformNewPassword || this.conformNewPassword.trim() === '') {
      this.otpError = "Kindly provide Confirm New Password !!";
      this.displayLoader = false;
      return false;
    }

    if (this.conformNewPassword !== this.newPassword) {
      this.otpError = "Password does not match!!";
      this.displayLoader = false;
      return false;
    }

    const forgotPasswordUser = new AuthenticationUser();
    forgotPasswordUser.userId = this.userName;
    forgotPasswordUser.password = this.newPassword;
    forgotPasswordUser.sessionDTO = this.sessionObject;

    this.authService.changeForgottenPassword(forgotPasswordUser)
      .pipe(first())
      .subscribe({
        next: (response) => {
          this.displayLoader = false;
          if (response['serviceStatus'] === "Success") {
            this.otpSuccess = response['serviceResponse'];
            this.isUsernameForm = true;
            this.isOtpForm = false;
            this.isPasswordChangeForm = false;
            setTimeout(() => { this.openSignInForm(); }, 4000);
          } else {
            this.otpError = response['serviceResponse'];
          }
        },
        error: (error) => {
          this.displayLoader = false;
          this.otpError = "An error occurred while resetting the password.";
          this.showToast('An error occurred while resetting the password.', 'error');
        }
      });


    return true;
  }

  userLogin(withPreviousSession: boolean = false): void {
    this.storage.setItem('loginEnable', 'true');

    this.displayLoader = true;
    this.otpError = "";
    this.loginError = "";

    const usernameRegex = /^[a-zA-Z0-9._@-]*$/;

    if (!this.userName || !usernameRegex.test(this.userName)) {
      this.otpError = this.userName === " "
        ? "UserName cannot have spaces !!"
        : "Special characters allowed: (_ , @ , - , .) !!";
      this.displayLoader = false;
      return;
    }

    if (!this.userName.trim()) {
      this.otpError = "Kindly provide UserName !!";
      this.displayLoader = false;
      return;
    }

    if (!this.password || !this.password.trim()) {
      this.otpError = "Kindly provide Password !!";
      this.displayLoader = false;
      return;
    }

    this.loginError = "";

    // Encrypt password and salt
    const [encryptedPassword, _salt] = this.setEncryption(this.password);
    const encryptedSalt = this.setEncryption(_salt)[0];

    // check Captcha Token based on the provider
    if (!this.validateCaptcha(withPreviousSession)) {
      this.displayLoader = false;
      return;
    }

    // Prepare user object
    this.user = {
      ...this.user,
      userName: this.userName,
      password: encryptedPassword,
      salt: encryptedSalt,
      secret: Math.random().toString(20).substring(2, 8),
      captchaToken: this.recaptchaToken,
      captchaProvider: this.captchaProvider,
      withPreviousSession: withPreviousSession,
      sessionDTO: {
        ...this.sessionObject,
        userId: this.userName,
        apiCalled: '/user/api/authenticateUser()'
      }
    };

    this.sessionObject.userId = this.userName;

    this.authService.login(this.user).pipe(first()).subscribe({
      next: (response: any) => {
        this.reloadCaptcha();
        const status = response?.serviceStatus;
        const serviceResp = response?.serviceResponse;
        if (serviceResp?.token) {
          const user = serviceResp;
          if (this.userName !== user.userId) {
            this.loginError = "Access Denied !!";
            this.authFlag = "Y";
            this.displayLoader = false;
            return;
          }

          if (user.secret && this.decryptSecret(user.secret) === this.user.secret) {
            const now = moment().format("DD-MM-YYYY HH:mm:ss");
            this.storage.setItem('loginTime', now);
            this.storage.setItem('lastLogin', now);
            this.storage.setItem('sessionId', uuidv4());
            this.storage.setItem('currentUser', JSON.stringify(this.decoderService.encryptJson(user)));
            this.storage.setItem('themeColour', user.themeColour);
            localStorage.removeItem('currentmenupage');

            this.authService.setcurrentUserSubject(user);
            this.authService.setToken(user.token);
            this.authService.setRole(user.role);
            this.authService.setUsername(user.userName);
            if (this.user.tool) { this.storage.setItem('tool', this.user.tool); }

            document.cookie = `access-token=${user.userName}; Secure; SameSite=Strict; Path=/BBPS/`;

            // this.router.navigate([this.returnUrl]).then(() => {
            //   location.reload();
            // });
            this.getLicenseDatesAndProceed(user);

            this.authFlag = "N";
          } else {
            this.loginError = "Access Denied !!";
            this.authFlag = "Y";
            this.displayLoader = false;
          }
        } else if (status === "Fail") {
          switch (serviceResp) {
            case "Incorrect Username OR Password!":
            case "Access Denied !!":
              this.loginError = serviceResp;
              this.showToast('Access Denied.', 'error');
              break;
            case "User Already Logged In":
              this.openModal();
              break;
            default:
              this.loginError = serviceResp || "Login failed!";
              this.showToast(this.loginError, 'error');
          }
          this.authFlag = "Y";
          this.displayLoader = false;
        } else {
          this.loginError = serviceResp || "Unexpected error occurred.";
          this.authFlag = "Y";
          this.displayLoader = false;
        }
      },
      error: (err) => {
        this.reloadCaptcha();
        this.loginError = "An error occurred during login. Please try again.";
        this.displayLoader = false;
      }
    });
  }

  confirmDeleteUser(): void {
    let _salt;
    this.storage.setItem('loginEnable', 'true');
    this.modalRef?.hide();
    this.loginError = '';
    this.user['userName'] = this.userName;

    [this.user.password, _salt] = this.setEncryption(this.password);
    this.user.salt = this.setEncryption(_salt)[0];

    this.sessionObject.apiCalled = '/user/api/authenticateUserWithPreviousSession()';
    this.user.sessionDTO = this.sessionObject;
    this.sessionObject.userId = this.userName;

    const secret = Math.random().toString(20).substring(2, 8);
    this.user.secret = secret;

    this.authService.loginUserWithPreviousSession(this.user).pipe(first()).subscribe({
      next: (response: any) => {
        const status = response?.serviceStatus;
        const serviceResp = response?.serviceResponse;

        if (serviceResp?.token) {
          const user = serviceResp;

          if (this.userName !== user.userId) {
            this.loginError = "Access Denied !!";
            this.displayLoader = false;
            this.authFlag = "Y";
            return;
          }

          if (user.secret && this.decryptSecret(user.secret) === secret) {
            const now = moment().format("DD-MM-YYYY HH:mm:ss");
            this.storage.setItem('loginTime', now);
            this.storage.setItem('lastLogin', now);
            this.storage.setItem('sessionId', uuidv4());

            const encryptedUser = this.decoderService.encryptJson(user);
            this.storage.setItem('currentUser', JSON.stringify(encryptedUser));

            this.authService.setcurrentUserSubject(user);
            this.authService.setToken(user.token);
            this.authService.setRole(user.role);
            this.authService.setUsername(user.userName);
            if (this.user.tool) { this.storage.setItem('tool', this.user.tool); }

            localStorage.setItem("theme-color", user.themeColour);
            localStorage.removeItem('currentmenupage');

            document.cookie = `access-token=${user.userName}; Secure; SameSite=Strict; Path=/ruambot/`;

            // this.router.navigate([this.returnUrl]).then(() => {
            //   location.reload();
            // });
            this.onLoginSuccess(user);
          } else {
            this.loginError = "Access Denied !!";
            this.displayLoader = false;
            this.authFlag = "Y";
          }
        } else if (status === "Fail") {
          switch (serviceResp) {
            case "Incorrect Username OR Password...!":
            case "Access Denied !!":
              this.loginError = serviceResp;
              break;
            case "Previous User Session is not Killed Properly":
              this.userLogin(true);
              break;
            default:
              this.loginError = serviceResp || "An error occurred.";
              this.authFlag = "Y";
          }
        }
        this.sessionObject.apiStatus = status;
      },
      error: () => {
        this.loginError = "An error occurred during authentication.";
        this.displayLoader = false;
      }
    });
  }

  setEncryption(value: string) {
    let salt = this.createSalt();
    value = value + salt;

    var key = CryptoJS.enc.Utf8.parse("IjfgGhpOiLjbrtJf");
    var iv = CryptoJS.enc.Utf8.parse("pOiJlKmmHgFvdStf");
    var encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(value.toString()), key, {
      keySize: 128 / 8,
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return [encrypted.toString(), salt];
  }

  decryptSecret(secret: string) {
    try {
      var key = CryptoJS.enc.Utf8.parse("IjfgGhpOiLjbrtJf");
      var iv = CryptoJS.enc.Utf8.parse("pOiJlKmmHgFvdStf");
      var decrypted = CryptoJS.AES.decrypt(secret, key, {
        keySize: 128 / 8,
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      let decryptedPass = decrypted.toString(CryptoJS.enc.Utf8);
      return decryptedPass.substring(0, 6)
    }
    catch (e) {
      return null;
    }
  }

  createSalt() {
    let dateFormat = 'yyyy-MM-DD HH:mm';

    let length = 24
    var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const currentDate = new Date();
    let date = moment(currentDate).format(dateFormat);
    length = length - date.length;

    var result = '';
    for (var i = 0; i < length; i++) {
      result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result + date;
  }

  enterSubmit(event: { keyCode: number; }) {
    if (event.keyCode === 13) {
    }
  }

  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }


  toggleFieldChangePassword() {
    this.fieldTextTypePassword = !this.fieldTextTypePassword;
  }

  checkUsername() {
    if (this.userName !== "") {
      this.authFlag = "N";
    }
  }

  checkPassWord() {

    if (this.password !== "") {
      this.authFlag = "N";
    }
  }

  passwordStrength: 'weak' | 'medium' | 'strong' | null = null;

  strengthChecker(password: string): void {
    const strongPassword = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{8,})/;
    const mediumPassword = /((?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{6,}))|((?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])(?=.{8,}))/;

    if (strongPassword.test(password)) {
      this.passwordStrength = 'strong';
    } else if (mediumPassword.test(password)) {
      this.passwordStrength = 'medium';
    } else {
      this.passwordStrength = 'weak';
    }
  }

  getStrengthColor(): string {
    switch (this.passwordStrength) {
      case 'strong':
        return 'green';
      case 'medium':
        return 'orange';
      case 'weak':
        return 'red';
      default:
        return 'transparent';
    }
  }

  getStrengthText(): string {
    switch (this.passwordStrength) {
      case 'strong':
        return 'Strong';
      case 'medium':
        return 'Medium';
      case 'weak':
        return 'Weak';
      default:
        return '';
    }
  }

  omit_special_char_pwd(event: { key: string; }) {
    this.otpError = "";
    var pattern = new RegExp(/[^\)/%,(~`"%'{}:;><\[\]]+/,);
    var result = pattern.test(event.key);
    if (result == false) {
      this.otpError = "Please Enter Valid Password!!";
    }
    return (result);
  }

  omit_special_char(event: { key: string; }) {
    this.otpError = "";
    var pattern = new RegExp(/[^\)/%,(~`"%'{}:;><#\[\]]+/, '');
    var result = pattern.test(event.key);
    if (result == false) {
      this.otpError = "Please Enter Valid User ID!!";
    }
    return (result);
  }
  onPaste(event: ClipboardEvent) {
    this.otpError = "";

    // Guard against null clipboardData
    if (!event.clipboardData) {
      return;
    }

    const pastedText = event.clipboardData.getData('text');
    let count = 0;
    const chars = pastedText.split('');

    // Regex to test allowed characters - your pattern seems fine
    const pattern = /[^\)%\,\(\~\`\"\'\{\}\:\;\>\<\#\[\]]/;

    for (const char of chars) {
      if (pattern.test(char)) {
        count++;
      }
    }

    if (count !== pastedText.length) {
      this.otpError = "Please Enter Valid UserID or Password!!";
      event.preventDefault();
    }
  }

  isModalVisible = false;

  openModal() {
    this.isModalVisible = true;
  }

  closeModal() {
    this.isModalVisible = false;
  }

  toast = {
    visible: false,
    message: '',
    type: ''
  };

  showToast(message: string, type: 'success' | 'error') {
    this.toast.message = message;
    this.toast.type = type;
    this.toast.visible = true;
    setTimeout(() => this.toast.visible = false, 3000);
  }

  private onLoginSuccess(user: any) {
    this.storage.setItem('currentUser', JSON.stringify(this.decoderService.encryptJson(user)));
    this.authService.setcurrentUserSubject(user);
    this.authService.setToken(user.token);
    this.authService.setRole(user.role);
    this.authService.setUsername(user.userName);

    const accessibleRoutes: string[] = [];
    user.subFeatures?.forEach((feature: any) => {
      feature.subFeature?.forEach((sub: any) => {
        if (sub?.routeName) accessibleRoutes.push(sub.routeName);
      });
    });

    let redirectTo = accessibleRoutes.includes('service-page')
      ? 'service-page'
      : (accessibleRoutes.length > 0 ? accessibleRoutes[0] : '/home');

    if (this.returnUrl && this.returnUrl !== '/service-page') {
      redirectTo = this.returnUrl;
    }

    this.storage.setItem('postLoginRedirect', redirectTo);
    if (this.user.tool) { this.storage.setItem('tool', this.user.tool); }
    location.reload();
  }

  getLicenseDatesAndProceed(user: any): void {
    this.licenseService.getLicenseDates().subscribe({
      next: (data: any) => {
        if (data?.serviceResponse?.expiresOn) {
          const expiry = data.serviceResponse.expiresOn;

          const expiryDate = new Date(expiry);
          const today = new Date();

          expiryDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);

          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          sessionStorage.setItem("LicenseDaysLeft", diffDays.toString());
          sessionStorage.setItem("ShowLicenseAlert", (diffDays > 0 && diffDays <= 30).toString());
        }
        this.onLoginSuccess(user);
      },
      error: (err) => {
        console.error("API Error:", err);
        this.onLoginSuccess(user);
      }
    });
  }

  // Activate License

  licenseString: string = '';
  isLicenseModalVisible = false;

  openLicenseModal() {
    this.isLicenseModalVisible = true;
  }

  closeLicenseodal() {
    this.isLicenseModalVisible = false;
  }

  confirmLicense(): void {
    if (!this.licenseString || !this.licenseString.trim()) {
      this.showToast('Please enter license string', 'error');
      return;
    }
    console.log('License String:', this.licenseString);

    this.licenseService.activateLicense(this.licenseString).subscribe({
      next: (res: any) => {
        console.log('License activated successfully', res);
        this.showToast(res?.message || 'License activated successfully', 'success');
        this.closeLicenseodal();
        this.licenseString = '';
      },
      error: (err) => {
        console.error('Activation failed', err);
        const msg = err?.error?.message || 'Activation failed';
        this.showToast(msg, 'error');
        this.closeLicenseodal();
        this.licenseString = '';
      }
    });
  }

}
