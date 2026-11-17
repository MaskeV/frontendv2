import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, ViewChildren, QueryList } from '@angular/core';
import { User } from '../../models/user';
import { Session } from '../../models/session';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../services/authentication.service';
import { DatabaseService } from '../../services/database-api.service';
import { ServiceIdService } from '../../services/service-id.service';
import { ApplicationService } from '../../services/application.service';
import { DateService } from '../../services/date.service';
import { Subject, takeUntil, forkJoin, of, catchError, map, Observable } from 'rxjs';
import { LoggerService } from '../../services/logger.service';
import { FaqBotService } from '../../services/faq-bot.service';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DragDropModule } from '@angular/cdk/drag-drop';


interface QuestionPart {
  text: string;
  isVariable: boolean;
  type?: string; // e.g., 'things', 'days', 'input'
  value?: string;
  placeholder?: string; // ✅ Add this
}

interface AlertDetails {
  alertId: string;
  alertName: string;
  application: string;
  startTime: string;
  endTime: string;
  metric: string;
  warning: string;
  critical: string;
  frequency: string;
}


interface Question {
  parts: QuestionPart[];
}

interface Message {
  type: 'user' | 'bot';
  text: string | SafeHtml;
}

@Component({
    selector: 'app-faq-bot',
    imports: [CommonModule, FormsModule, DragDropModule],
    templateUrl: './faq-bot.component.html',
    styleUrls: ['./faq-bot.component.css']
})
export class FaqBotComponent implements AfterViewInit {

  isChatbotVisible = false;
  showAddButton = false;
  dropdownVisible = false;
  dropdownOptions: string[] = [];
  dropdownPosition = { x: 0, y: 0 };
  selectedVariable: { qIndex: number; part: QuestionPart } | null = null;

  user: User = new User();
  currentUser: User | null = null;
  sessionObject: Session = new Session();
  private destroy$ = new Subject<void>();

  // Sample Data
  variableThings = ['hosts', 'applications', 'databases'];
  availableHosts = ['host1', 'host2'];
  availableDatabases = ['database1', 'database2'];
  availableApplications = ['iShine', 'NetraaLH'];
  variableDays = [1, 2, 3];
  preferredOrder = [];
  availableHostDetails: any[] = [];
  availableApplicationDetails: any[] = [];
  availableDatabaseDetails: any[] = [];

  problemTableData: any[] = [];
  alertDetails: AlertDetails | null = null;
  isRcaResponseAvailable = false;
  isTraceIdInRcaAvailable = false;
  withoutRca = false;

  relevantData = {
    summary: [] as string[],
    technicalAnalysis: [] as string[],
    impactedComponents: [] as string[],
    recommendations: [] as string[]
  };



  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private serviceIdService: ServiceIdService,
    private loggerService: LoggerService,
    private databaseService: DatabaseService,
    private applicationService: ApplicationService,
    private dateService: DateService,
    private faqService: FaqBotService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {

    this.authService.currentUser.subscribe(x => {
      if (x) {
        this.currentUser = x;
      }
    });

    this.getHostDetails();
    this.getApplicationNames();
    this.getDatabaseNames();
    if (this.currentUser) {
      this.user = this.currentUser;
    }
    // After data loads, initialize questions dynamically
    // forkJoin([
    //   this.databaseService.getAllAppListAndIpListByUserID(this.user, 'DATABASE'), //Databases
    //   this.databaseService.getAllAppListAndIpListByUserID(this.user, 'SERVICE'), //Applications
    //   this.applicationService.getAppIpInfoListByTypes(this.user) //Hosts
    // ]).subscribe(([dbRes, appRes, hostRes]: any) => {

    //   this.availableDatabaseDetails = dbRes.serviceResponse || [];
    //   this.availableApplicationDetails = appRes.serviceResponse || [];
    //   this.availableHostDetails = hostRes.serviceResponse || [];

    //   this.availableApplications = appRes.serviceResponse || [];
    //   this.availableDatabases = dbRes.serviceResponse || [];
    //   this.availableHosts = hostRes.serviceResponse.map((h: any) => h.applicationName);

    //   this.lists = {
    //     hosts: this.availableHosts,
    //     applications: this.availableApplications,
    //     databases: this.availableDatabases
    //   };

    //   // Now initialize dynamic question templates with actual values
    //   this.initializeQuestions();
    // });
  }

  lists: Record<string, string[]> = {
    hosts: this.availableHosts,
    applications: this.availableApplications,
    databases: this.availableDatabases
  };

  questions: Question[] = [];
  chatMessages: Message[] = [];

  ngAfterViewInit(): void {
    this.initializeQuestions();
  }

  private sanitizeHTML(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  initializeQuestions() {
    this.questions = [
      this.createQuestion(`List all the <things>${this.variableThings[0]}</things> monitored.`),
      this.createQuestion(
        `List all the problems for <things>${this.variableThings[0]}</things> for last <days>${this.variableDays[0]}</days> day(s).`
      ),
      this.createQuestion(`List the app configuration for <application>${this.availableApplications[0]}</application>.`),
      this.createQuestion(
        `List the problems of <application>${this.availableApplications[0]}</application> in last <days>${this.variableDays[0]}</days> day(s).`
      ),
      this.createQuestion(
        `List the problems for <things>${this.variableThings[0]}</things> : <list>${this.lists[this.variableThings[0]][0]}</list> in last <days>${this.variableDays[0]}</days> day(s).`
      ),
      this.createQuestion(
        `Show RCA for Trace ID : <input trace></input>`
      ),
      this.createQuestion(
        `Show relevant RCA for: <br>
        PID(Problem ID) : <input problemId></input>`
      ),
      this.createQuestion(
        `Show dashboard summary for : <br>                 
         URL : <input url></input><br>
         tabname: <input tab></input><br>
         instance: <input instance></input><br>
         Start time: <input start></input><br>
         End time: <input end></input>`
      )
    ];
  }

  createQuestion(template: string): Question {
    const parts: QuestionPart[] = [];
    let i = 0;

    while (i < template.length) {

      // 1️⃣ Detect <br> and <br/>
      if (template.startsWith('<br>', i)) {
        parts.push({ text: '<br>', isVariable: false });
        i += 4;
        continue;
      }
      if (template.startsWith('<br/>', i)) {
        parts.push({ text: '<br>', isVariable: false });
        i += 5;
        continue;
      }

      // 2️⃣ Detect variable tags <things> <input> etc.
      const tagMatch = template.substring(i).match(/^<(\w+)(?:\s+(\w+))?>(.*?)<\/\1>/);
      if (tagMatch) {
        const [, tag, subtype, value] = tagMatch;

        if (tag === "input") {
          let placeholder = subtype || 'Enter value';
          if (subtype === 'start') placeholder = 'YYYYMMDDHHmm';
          if (subtype === 'end') placeholder = 'YYYYMMDDHHmm';
          if (subtype === 'trace') placeholder = 'Enter trace ID';
          if (subtype === 'instance') placeholder = 'Enter instance name';
          if (subtype === 'tab') placeholder = 'Enter tab name';
          if (subtype === 'url') placeholder = 'Enter URL';
          if (subtype === 'problemId') placeholder = 'Enter PID';

          parts.push({
            text: '',
            isVariable: true,
            type: subtype || 'input',
            value: '',
            placeholder: placeholder
          });
        }
        else {
          parts.push({
            isVariable: true,
            text: '',
            type: tag,
            value
          });
        }

        i += tagMatch[0].length;
        continue;
      }

      // 3️⃣ Normal text
      parts.push({ text: template[i], isVariable: false });
      i++;
    }

    return { parts };
  }

  /** Return safe HTML for part.text (handles "<br>" and plain text) */
  getPartHtml(text: string): SafeHtml {
    if (text === '<br>') {
      return this.sanitizeHTML('<br/>'); // render real line break
    }
    return text; // normal characters shown normally
  }

  toggleChatbot() {
    this.isChatbotVisible = !this.isChatbotVisible;
  }

  closeChat() {
    this.isChatbotVisible = false;
  }
  // Initialize flag
  isMaximized = false;

  // Toggle maximize/minimize
  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
  }

  // ✅ Handle variable click
  // When opening dropdown, prevent this click from bubbling up
  onVariableClick(qIndex: number, part: QuestionPart, event: MouseEvent) {
    event.stopPropagation(); // 👈 prevents dropdown from closing immediately
    this.dropdownVisible = true;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.dropdownPosition = { x: rect.left, y: rect.bottom + 5 };
    this.selectedVariable = { qIndex, part };

    if (part.type === 'things') this.dropdownOptions = this.variableThings;
    else if (part.type === 'application') this.dropdownOptions = this.availableApplications;
    else if (part.type === 'days') this.dropdownOptions = this.variableDays.map(String);
    else if (part.type === 'list') {
      const thingType = this.questions[qIndex].parts.find(p => p.type === 'things')?.value || '';
      this.dropdownOptions = this.lists[thingType] || [];
    }
  }

  selectOption(option: string) {
    if (this.selectedVariable) {
      this.selectedVariable.part.value = option;
      // Auto-update list variable if "things" changed
      if (this.selectedVariable.part.type === 'things') {
        const listPart = this.questions[this.selectedVariable.qIndex].parts.find(p => p.type === 'list');
        if (listPart) listPart.value = this.lists[option][0];
      }

    }
    this.dropdownVisible = false;
  }

  // onSendClick(index: number) {
  //   const q = this.questions[index];

  //   const userText = q.parts.map(p => (p.isVariable ? p.value : p.text)).join('');
  //   this.chatMessages.push({ type: 'user', text: userText });

  //   const hasTraceInput = q.parts.some(p => p.type === 'trace');
  //   const hasDashboardInputs = q.parts.some(p => ['url', 'tab', 'instance', 'start', 'end'].includes(p.type!));

  //   const hasProblemId = q.parts.some(p => p.type === 'problemId');
  //   const hasDays = q.parts.some(p => p.type === 'day');

  //   if (hasProblemId && hasDays) {
  //     const problemId = q.parts.find(p => p.type === 'problemId')?.value;
  //     const days = q.parts.find(p => p.type === 'day')?.value;

  //     this.getProblemTable(problemId, days);
  //     return;
  //   }

  //   if (hasTraceInput) {
  //     const traceId = q.parts.find(p => p.type === 'trace')?.value;
  //     this.getRCA(traceId!);
  //   }
  //   else if (hasDashboardInputs) {
  //     this.handleDashboardSummary(q.parts);
  //   }
  //   else if (userText.includes('problems for') && userText.includes('all')) {
  //     this.getProblems(userText);
  //   }
  //   else if (userText.includes('configuration')) {
  //     this.getConfiguration(userText);
  //   }
  //   else if (userText.includes('monitored') && userText.includes('all')) {
  //     this.getMonitoredThings(userText);
  //   }
  //   else if (userText.includes('problems of') && !userText.includes('all')) {
  //     this.getProblemsForParticularApplication(userText);
  //   }
  //   else if (userText.includes(':')) {
  //     this.getProblemsForParticularItems(userText);
  //   }
  //   else {
  //     this.chatMessages.push({
  //       type: 'bot',
  //       text: "⚙️ I'm not sure which data you’re requesting."
  //     });
  //   }

  //   this.showAddButton = true;
  //   setTimeout(() => this.scrollToBottom());
  // }

  onSendClick(index: number) {
    const q = this.questions[index];

    // 1️⃣ Build user message
    const userText = q.parts.map(p => (p.isVariable ? p.value : p.text)).join('');
    this.chatMessages.push({ type: 'user', text: userText });

    // 2️⃣ Remove the question row BEFORE calling any API
    this.questions.splice(index, 1);

    // 3️⃣ Detect inputs
    const hasTraceInput = q.parts.some(p => p.type === 'trace');
    const hasDashboardInputs = q.parts.some(p => ['url', 'tab', 'instance', 'start', 'end'].includes(p.type!));
    const hasProblemId = q.parts.some(p => p.type === 'problemId');
    // const hasDays = q.parts.some(p => p.type === 'day');

    // 4️⃣ Handle RCA by PID
    if (hasProblemId) {
      const problemId = q.parts.find(p => p.type === 'problemId')?.value;

      // REMOVE QUESTION ROW
      this.questions.splice(index, 1);

      // ENSURE QUESTION LIST HIDES IMMEDIATELY
      this.showAddButton = true;

      // CALL API
      this.getProblemDetailsByPID(Number(problemId));

      setTimeout(() => this.scrollToBottom());
      return;  // now safe
    }


    // 5️⃣ Handle trace RCA
    if (hasTraceInput) {
      const traceId = q.parts.find(p => p.type === 'trace')?.value;
      this.getRCA(traceId!);
    }
    // 6️⃣ Handle dashboard summary
    else if (hasDashboardInputs) {
      this.handleDashboardSummary(q.parts);
    }
    // 7️⃣ Other handlers
    else if (userText.includes('problems for') && userText.includes('all')) {
      this.getProblems(userText);
    }
    else if (userText.includes('configuration')) {
      this.getConfiguration(userText);
    }
    else if (userText.includes('monitored') && userText.includes('all')) {
      this.getMonitoredThings(userText);
    }
    else if (userText.includes('problems of') && !userText.includes('all')) {
      this.getProblemsForParticularApplication(userText);
    }
    else if (userText.includes(':')) {
      this.getProblemsForParticularItems(userText);
    }
    else {
      this.chatMessages.push({
        type: 'bot',
        text: "⚙️ I'm not sure which data you’re requesting."
      });
    }

    // 8️⃣ Show + button and scroll
    this.showAddButton = true;
    setTimeout(() => this.scrollToBottom());
  }

  getProblemDetailsByPID(pid: number) {
    this.applicationService
      .getProblemDetailsByPID(pid)
      .subscribe({
        next: (response: any) => {

          const respo = response.serviceResponse;
          console.log("Problem Details by PID:", respo);
          this.getRelevantRca(respo);

        },
        error: (error) => {
          console.error('❌ Error calling Problem Details by PID API:', error);
        }
      });
  }

  getRelevantRca(respo: any) {

    const originalStart = new Date(respo.startTime);
    // ± 2 minutes range
    const startMinus2 = new Date(originalStart.getTime() - 2 * 60 * 1000);
    const startPlus2 = new Date(originalStart.getTime() + 2 * 60 * 1000);

    const apiStart = this.formatDateToNumber(startMinus2);
    const apiEnd = this.formatDateToNumber(startPlus2);

    const requestBody = {
      application: respo.appName,
      st: apiStart,
      et: apiEnd
    };

    this.applicationService.analyzeApplication(requestBody).subscribe({
      next: (response) => {
        const resp = response.answer;
        console.log('✅ Analyze API Response:', resp);
        const normalized = (resp || '').trim();

        if (normalized === '' ||
          normalized.startsWith('==== INFRASTRUCTURE SUMMARY ====')) {
          const finalRequest = {
            rca_response: null,
            application: respo.appName,
            st: apiStart,
            et: apiEnd,
            prompt: `Alert ID: ${respo.alertId}, named '${respo.alertName}', was triggered for the application '${respo.appName}'. The alert monitored the metric '${respo.metricName}' from ${respo.startTime} to ${respo.endTime}. The warning threshold was ${respo.warningThreshold} and the critical threshold was ${respo.criticalThreshold}. The alert was triggered ${respo.alertTriggerCount} times during this period.`
          };

          this.applicationService.relevantTraceData(finalRequest).subscribe({
            next: (response) => {
              const respo = response.rewritten_prompt;
              console.log('✅ Relevant trace data API TOTAL Response:', response);
              console.log('✅ Relevant trace data API Response:', respo);

              this.alertDetails = this.parseAlert(respo);
              this.withoutRca = true;

              const html = this.formatAlertCard(this.alertDetails);
              this.pushBotMessage(html);
            },
            error: (error) => {
              console.error('❌ Error calling analyze API:', error);
            }
          });
        }
        else {
          const finalRequest = {
            rca_response: resp,
            application: respo.appName,
            st: apiStart,
            et: apiEnd,
            prompt: `Alert ID: ${respo.alertId}, named '${respo.alertName}', was triggered for the application '${respo.appName}'. The alert monitored the metric '${respo.metricName}' from ${respo.startTime} to ${respo.endTime}. The warning threshold was ${respo.warningThreshold} and the critical threshold was ${respo.criticalThreshold}. The alert was triggered ${respo.alertTriggerCount} times during this period.`
          };

          this.applicationService.relevantTraceData(finalRequest).subscribe({
            next: (response) => {
              const respo = response.llm_response;
              console.log('✅ Relevant trace data API TOTAL Response:', response);
              console.log('✅ Relevant trace data API Response:', respo);

              this.parseRcaResponse(respo);
              this.isRcaResponseAvailable = true;

              const html = this.formatRcaCard(this.relevantData);
              this.pushBotMessage(html);

            },
            error: (error) => {
              console.error('❌ Error calling analyze API:', error);
            }
          });
        }

      },
      error: (error) => {
        console.error('❌ Error calling analyze API:', error);
      }
    });
  }

  handleDashboardSummary(parts: QuestionPart[]) {
    const url = parts.find(p => p.type === 'url')?.value;
    const tabName = parts.find(p => p.type === 'tab')?.value;
    const instance = parts.find(p => p.type === 'instance')?.value;
    const startTime = parts.find(p => p.type === 'start')?.value;
    const endTime = parts.find(p => p.type === 'end')?.value;

    if (!url || !tabName || !instance || !startTime || !endTime) {
      this.chatMessages.push({
        type: 'bot',
        text: '❗ Please fill URL, tabname, instance, Start time, and End time.'
      });
      this.scrollToBottom();
      return;
    }

    const ins = btoa(instance) + ".1";

    this.faqService
      .getConsolidatedMetrics(url, tabName, ins, startTime, endTime)
      .subscribe({
        next: (res) => {
          const raw = res?.model_response || JSON.stringify(res);

          const formattedText = this.formatModelResponse(raw);

          this.chatMessages.push({
            type: 'bot',
            text: this.sanitizeHTML(`
              <b>📊 Dashboard Summary:</b><br><br>
              ${formattedText}
            `)
          });

          this.scrollToBottom();
        },
        error: () => {
          this.chatMessages.push({
            type: 'bot',
            text: '⚠️ Error fetching dashboard summary.'
          });
          this.scrollToBottom();
        }
      });
  }

  private formatModelResponse(text: string): string {
    return text
      .replace(/\n/g, '<br>')                     // Convert newlines to <br>
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')     // Convert **bold** markdown
      .replace(/^- (.*)/gm, '• $1')               // Convert "-" bullets to dots
      .replace(/\n\s*•/g, '<br>•');               // Fix bullet spacing
  }

  getMonitoredThings(text: string) {
    const thingType = this.extractThingType(text); // "hosts", "applications", "databases"

    if (!thingType) return;

    let data: any[] = [];
    let icon = '';
    let title = '';

    switch (thingType) {
      case 'hosts':
        data = this.availableHostDetails;
        icon = "🖥️";
        title = "Monitored Hosts";
        break;
      case 'applications':
        data = this.availableApplications;
        icon = "🛠️";
        title = "Monitored Applications";
        break;
      case 'databases':
        data = this.availableDatabases;
        icon = "🗄️";
        title = "Monitored Databases";
        break;
    }

    if (!data.length) {
      this.chatMessages.push({ type: 'bot', text: `No monitored ${thingType} found.` });
      return;
    }

    // Build headers
    const isStringData = typeof data[0] === 'string';
    const headers = isStringData ? [thingType.slice(0, -1)] : Object.keys(data[0]); // e.g., "applications" -> "application"

    const tableHTML = `
    <div class="table-div">
      <table class="problem-table">
        <thead>
          <tr>${headers.map(h => `<th>${this.formatHeader(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              ${headers.map(h => `<td>${isStringData ? item : item[h] ?? 'N/A'}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

    this.chatMessages.push({
      type: 'bot',
      text: `<b>${icon} ${title}</b>:<br>${tableHTML}`
    });

    this.scrollToBottom();
  }

  getConfiguration(text: string) {
    const appName = this.extractAppNameForConfig(text);

    this.getAppConfiguration(appName, this.user).subscribe((res: any) => {
      const config = res?.serviceResponse;

      if (!config) {
        this.chatMessages.push({
          type: 'bot',
          text: `⚙️ No configuration data found for <b>${appName}</b>.`
        });
        this.scrollToBottom();
        return;
      }

      const appInfoHTML = `
  <div style="margin-bottom:10px;">
    <b>🧩 Application Configuration</b>
    <table style="margin-top:8px;border-collapse: collapse;">
      <tr>
        <td style="padding:2px 4px; font-weight:bold; min-width:5px;">Name :</td>
        <td style="padding:2px 4px;">${config.appName || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding:2px 4px; font-weight:bold;">Type :</td>
        <td style="padding:2px 4px;">${config.appType || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding:2px 4px; font-weight:bold;">ID :</td>
        <td style="padding:2px 4px;">${config.appId || 'N/A'}</td>
      </tr>
    </table>
  </div>
`;


      // ✅ Reusable Table Builder
      const buildTable = (title: string, data: any[], icon: string, excludeKeys: string[] = []) => {
        if (!data?.length) {
          return `<div style="margin-top:10px;">${icon} No ${title} found.</div>`;
        }

        // Exclude unwanted columns
        const headers = Object.keys(data[0]).filter(h => !excludeKeys.includes(h));

        return `
        <div style="margin-top:10px;">
          <b>${icon} ${title}:</b><br>
          <div class="table-div">
            <table class="problem-table">
              <thead>
                <tr>${headers.map(h => `<th>${this.formatHeader(h)}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${data
            .map(
              (item: any) =>
                `<tr>${headers
                  .map(h => `<td>${item[h] ?? 'N/A'}</td>`)
                  .join('')}</tr>`
            )
            .join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
      };

      // 🖥️ Infrastructure + 🗄️ Database Tables (exclude ip_type and db_ip_type)
      const infraHTML = buildTable('Infrastructure Details', config.infraDetails, '🖥️', ['ip_type']);
      const dbHTML = buildTable('Database Details', config.dbDetails, '🗄️', ['db_ip_type']);

      // 💬 Final Combined Message
      const messageHTML = `
      ${appInfoHTML}
      ${infraHTML}
      ${dbHTML}
    `;

      this.chatMessages.push({
        type: 'bot',
        text: this.sanitizeHTML(messageHTML)
      });

      this.scrollToBottom();
    });
  }

  // ✅ Unified reusable handler
  private fetchAndDisplayProblems(
    fetchFn: () => Observable<any>,
    thingType: string,
    days: number
  ) {
    fetchFn().subscribe((res: any) => {
      const problems = res?.serviceResponse || [];

      // ✅ No issues found
      if (!problems.length) {
        this.chatMessages.push({
          type: 'bot',
          text: `✅ No ${thingType} issues detected in the last ${days} days. Everything looks healthy!`
        });
        this.scrollToBottom();
        return;
      }

      // 🧠 Dynamic title
      let title = '';
      switch (thingType.toUpperCase()) {
        case 'SERVICE':
          title = '🧩 Application Service Issues';
          break;
        case 'INFRA':
          title = '💻 Infrastructure Alerts';
          break;
        case 'DATABASE':
          title = '🗄️ Database Problems';
          break;
        default:
          title = `${thingType} Issues`;
      }

      // 🧾 Table generation
      const excludedKeys = ['applicationId', 'body', 'alertId', ''];
      const preferredOrder = [
        'alertTriggerId',
        'applicationName',
        'applicationType',
        'alertName',
        'status',
        'startTime',
        'endTime',
        'triggerCount',
        'breachValue',
        'thresholdWarningValue',
        'thresholdCriticalValue',
        'level1MailId',
        'level2MailId',
        'level3MailId'
      ];
      const headers = Object.keys(problems[0])
        .filter(key => !excludedKeys.includes(key))
        .sort((a, b) => {
          const indexA = preferredOrder.indexOf(a);
          const indexB = preferredOrder.indexOf(b);
          if (indexA === -1 && indexB === -1) return a.localeCompare(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });



      // Wrap table in a div for scrollable container
      let tableHTML = `
  <div class="table-div">
    <table class="problem-table">
      <thead>
        <tr>
          ${headers.map(h => `<th>${this.formatHeader(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
`;

      problems.forEach((p: any) => {
        const rowColor = p.status === 'Critical' ? '#fff0f0' : '#fffdee';

        const cells = headers.map(h => {
          if (h.toLowerCase() === 'status') {
            let badgeColor = '';
            switch (p[h]) {
              case 'Critical': badgeColor = '#e74c3c'; break;
              case 'Warning': badgeColor = '#f1c40f'; break;
              case 'Resolved': badgeColor = '#2ecc71'; break;
              default: badgeColor = '#7f8c8d';
            }
            return `
        <td><span class="status-badge" style="background:${badgeColor};">${p[h]}</span></td>
      `;
          }
          return `<td>${p[h] ?? 'N/A'}</td>`;
        }).join('');

        tableHTML += `<tr style="background:${rowColor}">${cells}</tr>`;
      });

      tableHTML += '</tbody></table></div>';


      // 💬 Chat reply
      this.chatMessages.push({
        type: 'bot',
        text: this.sanitizeHTML(`<b>${title}</b> (Last ${days} days):<br>${tableHTML}`)
      });

      this.scrollToBottom();
    });
  }

  getRCA(traceID: string) {
    this.getRCAForTraceID(traceID).subscribe({
      next: (res) => {
        const summaries: string[] = res?.serviceResponse;

        if (summaries && summaries.length) {
          summaries.forEach((summary: string) => {
            // Add line breaks before headers and format bullets
            const formatted = summary
              .replace(/1\.\s?\*\*(.*?)\*\*/g, '<br><b>$1</b>')   // Infrastructure Issue Summary
              .replace(/2\.\s?\*\*(.*?)\*\*/g, '<br><b>$1</b>')   // Root Cause
              .replace(/3\.\s?\*\*(.*?)\*\*/g, '<br><b>$1</b>')   // Recommendations
              .replace(/\n\s*-\s/g, '<br>• ');                    // bullets for each line

            this.chatMessages.push({
              type: 'bot',
              text: formatted
            });
          });
        } else {
          this.chatMessages.push({
            type: 'bot',
            text: 'No RCA data found for this Trace ID.'
          });
        }
        this.scrollToBottom();
      },
      error: (err) => {
        this.chatMessages.push({
          type: 'bot',
          text: '⚠️ Error fetching RCA data.'
        });
        console.error(err);
        this.scrollToBottom();
      }
    });
  }

  private formatDateToNumber(date: Date): number {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return Number(`${year}${month}${day}${hour}${minute}`);
  }

  formatAlert(alert: any) {
    const start = new Date(alert.startTime);
    const end = new Date(alert.endTime);

    // Duration in minutes
    const diffMs = end.getTime() - start.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    // Format date as YYYY-MM-DD HH:mm:ss
    const formattedStart = alert.startTime.replace("T", " ").split(".")[0];

    return {
      problem: alert.alertName,
      impacted: alert.applicationName,
      problemStatus: alert.problemStatus,
      severity: alert.status,
      startDate: formattedStart,
      duration: `${hours}h ${remainingMins}m`,
      selected: false,
      expanded: false,
      details: {
        status: alert.problemStatus,
        applicationId: alert.applicationId,
        applicationType: alert.applicationType,
        alertId: alert.alertId,
        metricName: alert.metricName,
        thresholdWarningValue: alert.thresholdWarningValue,
        thresholdCriticalValue: alert.thresholdCriticalValue,
        level1MailId: alert.level1MailId,
        level2MailId: alert.level2MailId,
        level3MailId: alert.level3MailId,
        alertTriggerId: alert.alertTriggerId,
        triggerCount: alert.triggerCount,
        breachValue: alert.breachValue
      }
    };
  }


  formatRcaCard(data: any): string {
    return `
      <div class="rca-container">
  
        ${data.summary.length ? `
          <h4>🧩 Summary</h4>
          <ul>${data.summary.map((x: any) => `<li>${x}</li>`).join('')}</ul>
        ` : ''}
  
        ${data.technicalAnalysis.length ? `
          <h4>⚙️ Technical Analysis</h4>
          <ul>${data.technicalAnalysis.map((x: any) => `<li>${x}</li>`).join('')}</ul>
        ` : ''}
  
        ${data.impactedComponents.length ? `
          <h4>💥 Impacted Components</h4>
          <ul>${data.impactedComponents.map((x: any) => `<li>${x}</li>`).join('')}</ul>
        ` : ''}
  
        ${data.recommendations.length ? `
          <h4>💡 Recommendations</h4>
          <ul>${data.recommendations.map((x: any) => `<li>${x}</li>`).join('')}</ul>
        ` : ''}
  
      </div>
    `;
  }

  formatAlertCard(d: AlertDetails): string {
    return `
    <div class="alert-card-bot clean-alert-card">
  
        <div class="alert-title">Alert ID: ${d.alertId}</div>
        <div class="alert-name">${d.alertName}</div>
  
        <h4>Monitoring Period</h4>
        <div class="row-item">
          <strong>Initiated at:</strong>
          <span>${d.startTime}</span>
        </div>
        <div class="row-item">
          <strong>End:</strong>
          <span>${d.endTime}</span>
        </div>
  
        <h4>Monitored Metric</h4>
        <div class="row-item">
          <span>${d.metric}</span>
        </div>
  
        <h4>Thresholds</h4>
        <div class="row-item">
          <strong>Warning:</strong>
          <span>${d.warning}</span>
        </div>
        <div class="row-item">
          <strong>Critical:</strong>
          <span>${d.critical}</span>
        </div>
  
        <h4>Alert Trigger Frequency</h4>
        <div class="row-item">
          <span>${d.frequency}</span>
        </div>
  
    </div>`;
  }

  pushBotMessage(html: string) {
    this.chatMessages.push({
      type: 'bot',
      text: this.sanitizer.bypassSecurityTrustHtml(html)
    });
    this.scrollToBottom();
  }

  parseAlert(text: string): AlertDetails {
    const alert: AlertDetails = {
      alertId: '',
      alertName: '',
      application: '',
      startTime: '',
      endTime: '',
      metric: '',
      warning: '',
      critical: '',
      frequency: ''
    };

    alert.alertId = text.match(/Alert ID:\s*(.+)/)?.[1]?.trim() || '';
    alert.alertName = text.match(/Alert Name:\s*(.+)/)?.[1]?.trim() || '';
    alert.application = text.match(/Application Name:\s*(.+)/)?.[1]?.trim() || '';

    // Extract from "Time Period: START to END"
    const timeMatch = text.match(/Time Period:\s*(.+)\s+to\s+(.+)/);
    alert.startTime = timeMatch?.[1]?.trim() || '';
    alert.endTime = timeMatch?.[2]?.trim() || '';

    // Metric Monitored
    alert.metric = text.match(/Metric Monitored:\s*(.+)/)?.[1]?.trim() || '';

    alert.warning = text.match(/Warning Threshold:\s*(.+)/)?.[1]?.trim() || '';
    alert.critical = text.match(/Critical Threshold:\s*(.+)/)?.[1]?.trim() || '';

    // Alert Occurrences
    alert.frequency = text.match(/Alert Occurrences:\s*(.+)/)?.[1]?.trim() || '';

    return alert;
  }

  parseRcaResponse(responseText: string): void {
    if (!responseText) return;

    const summaryMatch = responseText.match(/1\.\s*Summary:(.*?)(?=2\.)/s);
    const analysisMatch = responseText.match(/2\.\s*Technical Analysis:(.*?)(?=3\.)/s);
    const impactedMatch = responseText.match(/3\.\s*Impacted Components:(.*?)(?=4\.)/s);
    const recommendationMatch = responseText.match(/4\.\s*Recommendations:(.*)/s);

    this.relevantData = {
      summary: this.extractPoints(summaryMatch ? summaryMatch[1] : ''),
      technicalAnalysis: this.extractPoints(analysisMatch ? analysisMatch[1] : ''),
      impactedComponents: this.extractPoints(impactedMatch ? impactedMatch[1] : ''),
      recommendations: this.extractPoints(recommendationMatch ? recommendationMatch[1] : '')
    };

    console.log('✅ Parsed RCA Relevant Data:', this.relevantData);
  }

  private extractPoints(section: string): string[] {
    if (!section) return [];
    return section
      .split(/\n|-\s+/) // split on newline or bullet start
      .map(line => line.trim().replace(/^[-•]\s*/, '')) // clean bullet marks
      .filter(line => line.length > 0);
  }

  // ⚙️ Wrapper for generic case
  getProblems(text: string) {
    const thingType = this.extractThingTypeForAPI(text);
    const days = this.extractDays(text);

    this.fetchAndDisplayProblems(
      () => this.getProblemsByType(this.user, thingType, days),
      thingType,
      days
    );
  }

  // ⚙️ Wrapper for app-specific case
  getProblemsForParticularApplication(text: string) {
    const thingType = 'SERVICE';
    const days = this.extractDays(text);
    const appName = this.extractApplicationName(text);

    this.fetchAndDisplayProblems(
      () => this.getProblemsByTypeApp(this.user, thingType, days, appName),
      thingType,
      days
    );
  }

  getProblemsForParticularItems(text: string) {
    const thingType = this.extractThingTypeForAPI(text);
    const days = this.extractDays(text);
    const appName = this.extractParticularApplicationName(text);

    this.fetchAndDisplayProblems(
      () => this.getProblemsByTypeApp(this.user, thingType, days, appName),
      thingType,
      days
    );
  }

  private formatHeader(header: string): string {
    const mapping: Record<string, string> = {
      alertTriggerId: 'Alert Trigger ID',
      applicationName: 'Application Name',
      applicationType: 'Application Type',
      alertName: 'Alert Name',
      status: 'Status',
      startTime: 'Start Time',
      endTime: 'End Time',
      thresholdWarningValue: 'Threshold Warning Value',
      thresholdCriticalValue: 'Threshold Critical Value',
      level1MailId: 'Level1 Mail ID',
      level2MailId: 'Level2 Mail ID',
      level3MailId: 'Level3 Mail ID',
      triggerCount: 'Trigger Count',
      breachValue: 'Breach Value',
      ip_address: 'IP Address',
      ip_type: 'IP Type',
      environment: 'Environment',
      hostId: 'Host ID',
      hostName: 'Host Name',
      hostType: 'Host Type',
      db_ip_address: 'DB IP Address',
      db_ip_type: 'DB IP Type',
      db_environment: 'DB Environment',
      dbId: 'DB ID',
      dbName: 'DB Name',
      dbType: 'DB Type'
    };
    return mapping[header] || header;
  }


  extractThingType(text: string): string {
    if (text.includes('host')) return 'hosts';
    if (text.includes('app')) return 'applications';
    if (text.includes('database')) return 'databases';
    return '';
  }
  extractThingTypeForAPI(text: string): string {
    if (text.includes('host')) return 'INFRA';
    if (text.includes('app')) return 'SERVICE';
    if (text.includes('database')) return 'DATABASE';
    return '';
  }

  /**🧩 Extracts application name from text like:"List the problems of Ishine_PROD in last 1 day(s)." → returns "Ishine_PROD" */

  private extractApplicationName(text: string): string | '' {
    const match = text.match(/of\s+(.+?)\s+in/i);
    return match ? match[1].trim() : '';
  }

  private extractParticularApplicationName(text: string): string {
    // Match everything after first colon up to the first " in"
    const match = text.match(/:\s*([^]+?)\s+in/i);
    return match ? match[1].trim() : '';
  }

  extractDays(text: string): number {
    const match = text.match(/(\d+)\s*day/);
    return match ? +match[1] : 1;
  }

  extractAppName(text: string): string {
    const match = text.match(/for\s+(\w+)/);
    return match ? match[1] : '';
  }

  private extractAppNameForConfig(text: string): string {
    const match = text.match(/for\s+(.+?)\./i);
    return match ? match[1].trim() : '';
  }


  getAppConfiguration(appName: string, user: any): Observable<any> {
    return this.faqService.getAppConfiguration(user, appName);
  }


  getProblemsByType(user: any, type: string, days: number): Observable<any> {
    // Call real API
    return this.faqService.getAllProblemDetailsByUserID(user, type, days);
  }

  getProblemsByTypeApp(user: any, type: string, days: number, appName: string): Observable<any> {
    return this.faqService.getAllProblemDetailsByUserIDAppName(user, type, days, appName);
  }

  getRCAForTraceID(traceID: string): Observable<any> {
    return this.faqService.getInfrastructureSummary(traceID);
  }

  // END OF BOT RESPONSES //

  addQuestions() {
    this.chatMessages.push({ type: 'bot', text: 'Here are your questions again:' });
    this.showAddButton = false;
    this.initializeQuestions();
    this.scrollToBottom();
  }


  DatabaseNames: string[] = [];
  getDatabaseNames(): void {
    if (!this.currentUser) {
      console.error('No current user');
      return;
    }
    this.user = this.currentUser;
    this.user.sessionDTO = this.sessionObject;
    this.sessionObject.featureName = "RUAMBOT";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    // this.databaseService.getAllAppListAndIpListByUserID(this.user, 'DATABASE').subscribe((data: any) => {
    //   this.DatabaseNames = data.serviceResponse || [];
    // });
  }


  ApplicationNames: string[] = [];
  getApplicationNames(): void {
    if (!this.currentUser) {
      console.error('No current user');
      return;
    }
    this.user = this.currentUser;
    this.user.sessionDTO = this.sessionObject;
    this.sessionObject.featureName = "RUAMBOT";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    // this.databaseService.getAllAppListAndIpListByUserID(this.user, 'SERVICE').subscribe((data: any) => {
    //   this.DatabaseNames = data.serviceResponse || [];
    // });
  }

  applicationNameMap: any;
  isLoading: boolean = true;
  serviceHosts: { ipAddressId: string, ipAddress: string, applicationName: string, ipType: string }[] = [];

  getHostDetails(): void {
    this.isLoading = true;
    if (this.currentUser) {
      this.user = this.currentUser;
    }
    this.user.sessionDTO = this.sessionObject;

    this.sessionObject.featureName = "RUAMBOT";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

  
  }


  @ViewChild('chatbotBody') chatbotBody!: ElementRef;
  private scrollToBottom() {
    if (!this.chatbotBody) return;
    // Use setTimeout with 0ms to wait for Angular to render new messages
    setTimeout(() => {
      const container = this.chatbotBody.nativeElement;
      // Scroll to bottom
      container.scrollTop = container.scrollHeight;
      // Optional: Smooth scrolling
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }, 0);
  }


  @ViewChild('variableDropdown') variableDropdown!: ElementRef;
  @ViewChildren('questionVariable') questionVariables!: QueryList<ElementRef>;
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as Node;

    const clickedInsideVariable = this.questionVariables?.some(
      (el) => el.nativeElement.contains(target)
    );

    const clickedInsideDropdown = this.variableDropdown?.nativeElement.contains(target);

    if (!clickedInsideVariable && !clickedInsideDropdown) {
      this.dropdownVisible = false;
    }
  }

}