import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SearchPipe } from '../../../../../pipes/search.pipe';

@Component({
  selector: 'app-error-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SearchPipe],
  templateUrl: './error-crashes-overview.component.html',
  styleUrls: ['./error-crashes-overview.component.css']
})
export class ErrorOverviewComponent {
  @Input() context: any;
  get errorsCrashesOverview() { return this.context?.errorsCrashesOverview; }
  set errorsCrashesOverview(val) { if (this.context) this.context.errorsCrashesOverview = val; }
  get mockEotData() { return this.context?.mockEotData; }
  set mockEotData(val) { if (this.context) this.context.mockEotData = val; }
  get maxErrors() { return this.context?.maxErrors; }
  set maxErrors(val) { if (this.context) this.context.maxErrors = val; }
  get maxCrashes() { return this.context?.maxCrashes; }
  set maxCrashes(val) { if (this.context) this.context.maxCrashes = val; }
  get showEotErrors() { return this.context?.showEotErrors; }
  set showEotErrors(val) { if (this.context) this.context.showEotErrors = val; }
  get showEotCrashes() { return this.context?.showEotCrashes; }
  set showEotCrashes(val) { if (this.context) this.context.showEotCrashes = val; }
  get eotYAxisLabels() { return this.context?.eotYAxisLabels; }
  set eotYAxisLabels(val) { if (this.context) this.context.eotYAxisLabels = val; }
  get eotCrashesPath() { return this.context?.eotCrashesPath; }
  set eotCrashesPath(val) { if (this.context) this.context.eotCrashesPath = val; }
  get eotCrashesAreaPath() { return this.context?.eotCrashesAreaPath; }
  set eotCrashesAreaPath(val) { if (this.context) this.context.eotCrashesAreaPath = val; }
  get eotCrashesPoints() { return this.context?.eotCrashesPoints; }
  set eotCrashesPoints(val) { if (this.context) this.context.eotCrashesPoints = val; }
  get eotErrorsPath() { return this.context?.eotErrorsPath; }
  set eotErrorsPath(val) { if (this.context) this.context.eotErrorsPath = val; }
  get eotErrorsAreaPath() { return this.context?.eotErrorsAreaPath; }
  set eotErrorsAreaPath(val) { if (this.context) this.context.eotErrorsAreaPath = val; }
  get eotErrorsPoints() { return this.context?.eotErrorsPoints; }
  set eotErrorsPoints(val) { if (this.context) this.context.eotErrorsPoints = val; }
  get mockCrashReasons() { return this.context?.mockCrashReasons; }
  set mockCrashReasons(val) { if (this.context) this.context.mockCrashReasons = val; }
  get mockErrorReasons() { return this.context?.mockErrorReasons; }
  set mockErrorReasons(val) { if (this.context) this.context.mockErrorReasons = val; }
  get pbCrashPath() { return this.context?.pbCrashPath; }
  set pbCrashPath(val) { if (this.context) this.context.pbCrashPath = val; }
  get pbErrorsPath() { return this.context?.pbErrorsPath; }
  set pbErrorsPath(val) { if (this.context) this.context.pbErrorsPath = val; }
  get pbOthersPath() { return this.context?.pbOthersPath; }
  set pbOthersPath(val) { if (this.context) this.context.pbOthersPath = val; }
  get pbCrashTotal() { return this.context?.pbCrashTotal; }
  set pbCrashTotal(val) { if (this.context) this.context.pbCrashTotal = val; }
  get pbErrorsTotal() { return this.context?.pbErrorsTotal; }
  set pbErrorsTotal(val) { if (this.context) this.context.pbErrorsTotal = val; }
  get pbOthersTotal() { return this.context?.pbOthersTotal; }
  set pbOthersTotal(val) { if (this.context) this.context.pbOthersTotal = val; }
  get pbCrashUsersPath() { return this.context?.pbCrashUsersPath; }
  set pbCrashUsersPath(val) { if (this.context) this.context.pbCrashUsersPath = val; }
  get pbErrorsUsersPath() { return this.context?.pbErrorsUsersPath; }
  set pbErrorsUsersPath(val) { if (this.context) this.context.pbErrorsUsersPath = val; }
  get pbOthersUsersPath() { return this.context?.pbOthersUsersPath; }
  set pbOthersUsersPath(val) { if (this.context) this.context.pbOthersUsersPath = val; }
  get pbCrashUsersTotal() { return this.context?.pbCrashUsersTotal; }
  set pbCrashUsersTotal(val) { if (this.context) this.context.pbCrashUsersTotal = val; }
  get pbErrorsUsersTotal() { return this.context?.pbErrorsUsersTotal; }
  set pbErrorsUsersTotal(val) { if (this.context) this.context.pbErrorsUsersTotal = val; }
  get pbOthersUsersTotal() { return this.context?.pbOthersUsersTotal; }
  set pbOthersUsersTotal(val) { if (this.context) this.context.pbOthersUsersTotal = val; }
  get showCrashPlatform() { return this.context?.showCrashPlatform; }
  set showCrashPlatform(val) { if (this.context) this.context.showCrashPlatform = val; }
  get donutAndroidArcPath() { return this.context?.donutAndroidArcPath; }
  set donutAndroidArcPath(val) { if (this.context) this.context.donutAndroidArcPath = val; }
  get donutIosArcPath() { return this.context?.donutIosArcPath; }
  set donutIosArcPath(val) { if (this.context) this.context.donutIosArcPath = val; }
  get donutWebArcPath() { return this.context?.donutWebArcPath; }
  set donutWebArcPath(val) { if (this.context) this.context.donutWebArcPath = val; }
  get donutIosLabelPath() { return this.context?.donutIosLabelPath; }
  set donutIosLabelPath(val) { if (this.context) this.context.donutIosLabelPath = val; }
  get donutAndroidLabelPath() { return this.context?.donutAndroidLabelPath; }
  set donutAndroidLabelPath(val) { if (this.context) this.context.donutAndroidLabelPath = val; }
  get showPbErrorsAndroid() { return this.context?.showPbErrorsAndroid; }
  set showPbErrorsAndroid(val) { if (this.context) this.context.showPbErrorsAndroid = val; }
  get showPbErrorsIos() { return this.context?.showPbErrorsIos; }
  set showPbErrorsIos(val) { if (this.context) this.context.showPbErrorsIos = val; }
  get showPbErrorsOther() { return this.context?.showPbErrorsOther; }
  set showPbErrorsOther(val) { if (this.context) this.context.showPbErrorsOther = val; }
  get showPbCrashesAndroid() { return this.context?.showPbCrashesAndroid; }
  set showPbCrashesAndroid(val) { if (this.context) this.context.showPbCrashesAndroid = val; }
  get showPbCrashesIos() { return this.context?.showPbCrashesIos; }
  set showPbCrashesIos(val) { if (this.context) this.context.showPbCrashesIos = val; }
  get showPbCrashesOther() { return this.context?.showPbCrashesOther; }
  set showPbCrashesOther(val) { if (this.context) this.context.showPbCrashesOther = val; }
  calculateEotGraph(...args: any[]) { return this.context?.calculateEotGraph(...args); }
  calculatePlaybackChart(...args: any[]) { return this.context?.calculatePlaybackChart(...args); }
  calculateDonutChart(...args: any[]) { return this.context?.calculateDonutChart(...args); }
  calculateDonutChartErrors(...args: any[]) { return this.context?.calculateDonutChartErrors(...args); }
  get topErrorTypes() { return this.context?.topErrorTypes; }
  set topErrorTypes(val) { if (this.context) this.context.topErrorTypes = val; }
  topErrorTypes_call(...args: any[]) { return this.context?.topErrorTypes(...args); }
  get errorsByAppVersion() { return this.context?.errorsByAppVersion; }
  set errorsByAppVersion(val) { if (this.context) this.context.errorsByAppVersion = val; }
  errorsByAppVersion_call(...args: any[]) { return this.context?.errorsByAppVersion(...args); }
  get crashesByAppVersion() { return this.context?.crashesByAppVersion; }
  set crashesByAppVersion(val) { if (this.context) this.context.crashesByAppVersion = val; }
  crashesByAppVersion_call(...args: any[]) { return this.context?.crashesByAppVersion(...args); }
  get pbStats() { return this.context?.pbStats; }
  set pbStats(val) { if (this.context) this.context.pbStats = val; }
  pbStats_call(...args: any[]) { return this.context?.pbStats(...args); }
  get topCrashes() { return this.context?.topCrashes; }
  set topCrashes(val) { if (this.context) this.context.topCrashes = val; }
  topCrashes_call(...args: any[]) { return this.context?.topCrashes(...args); }
  get getDynamicRateHeader() { return this.context?.getDynamicRateHeader; }
  set getDynamicRateHeader(val) { if (this.context) this.context.getDynamicRateHeader = val; }
  getDynamicRateHeader_call(...args: any[]) { return this.context?.getDynamicRateHeader(...args); }
  get topErrorMessages() { return this.context?.topErrorMessages; }
  set topErrorMessages(val) { if (this.context) this.context.topErrorMessages = val; }
  topErrorMessages_call(...args: any[]) { return this.context?.topErrorMessages(...args); }
  get eotXAxisLabels() { return this.context?.eotXAxisLabels; }
  set eotXAxisLabels(val) { if (this.context) this.context.eotXAxisLabels = val; }
  eotXAxisLabels_call(...args: any[]) { return this.context?.eotXAxisLabels(...args); }
  get getPbCrashesDash() { return this.context?.getPbCrashesDash; }
  set getPbCrashesDash(val) { if (this.context) this.context.getPbCrashesDash = val; }
  getPbCrashesDash_call(...args: any[]) { return this.context?.getPbCrashesDash(...args); }
  get getDynamicRateValue() { return this.context?.getDynamicRateValue; }
  set getDynamicRateValue(val) { if (this.context) this.context.getDynamicRateValue = val; }
  getDynamicRateValue_call(...args: any[]) { return this.context?.getDynamicRateValue(...args); }
  get getEvcDash() { return this.context?.getEvcDash; }
  set getEvcDash(val) { if (this.context) this.context.getEvcDash = val; }
  getEvcDash_call(...args: any[]) { return this.context?.getEvcDash(...args); }
  get showEvcCrashes() { return this.context?.showEvcCrashes; }
  set showEvcCrashes(val) { if (this.context) this.context.showEvcCrashes = val; }
  showEvcCrashes_call(...args: any[]) { return this.context?.showEvcCrashes(...args); }
  get topAffectedUsers(): any[] { return (this.context?.topAffectedUsers || []).filter((u: any) => u.affectedSessions > 0); }
  set topAffectedUsers(val) { if (this.context) this.context.topAffectedUsers = val; }
  topAffectedUsers_call(...args: any[]) { return this.context?.topAffectedUsers(...args); }
  get getPbErrorsDash() { return this.context?.getPbErrorsDash; }
  set getPbErrorsDash(val) { if (this.context) this.context.getPbErrorsDash = val; }
  getPbErrorsDash_call(...args: any[]) { return this.context?.getPbErrorsDash(...args); }
  get showEvcErrors() { return this.context?.showEvcErrors; }
  set showEvcErrors(val) { if (this.context) this.context.showEvcErrors = val; }
  showEvcErrors_call(...args: any[]) { return this.context?.showEvcErrors(...args); }

  constructor(private router: Router) {}

  viewErrorDetail(item: any) {
    const errorId = item.id || item.error_id || item.name || 'ERR-8f3a2e7c';
    this.router.navigate(['/mrum/mrum-error-crashes', encodeURIComponent(errorId)], {
      queryParamsHandling: 'preserve'
    });
  }

  viewAllErrors(event: Event, type: string = 'Error') {
    event.stopPropagation();
    this.router.navigate(['/mrum/mrum-errors-list'], {
      queryParams: { type: type },
      queryParamsHandling: 'merge'
    });
  }
}