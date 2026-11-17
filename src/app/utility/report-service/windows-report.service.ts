import { Injectable } from '@angular/core';
import { SmReportsApiService } from '../../services/sm-reports-api.service';

@Injectable({
  providedIn: 'root'
})
export class WindowsReportService {

 constructor() { }

 
   public getWindowsHtmlTemplate(): string {
     const baseUrl = window.location.origin;
     const absoluteImagePath = `${baseUrl}/assets/images/favicon.png`;
     return `
 <!DOCTYPE html>
 <html lang="en">
 
 <head>
   <meta charset="UTF-8" />
   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
   <title>Infrastructure Performance Report</title>
   <link rel="icon" type="image/png" href="${absoluteImagePath}" />

  <link rel="stylesheet" href="${baseUrl}/assets/css/tailwind.min.css">

  <script src="${baseUrl}/assets/js/highcharts.js"></script>
  <script src="${baseUrl}/assets/js/highcharts-more.js"></script>
  <script src="${baseUrl}/assets/js/solid-gauge.js"></script>

   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
   <style>
     body {
       font-family: 'Inter', sans-serif;
     }
 
     .highcharts-background {
       fill: transparent;
     }
 
     .chart-card {
       min-height: 200px;
       display: flex;
       align-items: center;
       justify-content: center;
     }
 
     .filter-bar {
       display: flex;
       flex-wrap: wrap;
       gap: 1rem;
       align-items: flex-end;
     }
 
     .filter-card {
       background: #fff;
       border-radius: 12px;
       padding: 0.6rem 0.8rem;
       box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05), 0 4px 8px rgba(0, 0, 0, 0.05);
       display: flex;
       flex-direction: column;
       min-width: 220px;
       transition: box-shadow 0.3s ease, transform 0.3s ease;
     }
 
     .card-header {
       padding: 4px 6px;
       border: none;
       border-radius: 0%;
       font-size: small;
       border-bottom: 1px solid black;
       font-family: 'Inter', 'Roboto', 'Segoe UI', sans-serif;
     }
 
     .chart-title {
       font-weight: 500;
       letter-spacing: 0.7px;
       color: var(--text-color);
       background-color: #66A3AD85;
     }
 
     .filter-card:hover {
       transform: translateY(-2px);
       box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
     }
 
     .filter-card select {
       border: none;
       outline: none;
       background: #f7fafc;
       border-radius: 8px;
       padding: 0.4rem 0.6rem;
       font-size: 0.9rem;
       box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
     }
 
     .filter-label {
       font-weight: 600;
       font-size: 0.8rem;
       color: #4A5568;
       margin-bottom: 0.3rem;
     }
 
     .kpi-card {
       background: #f9fafb;
       /* light neutral background */
       border: 1px solid #e5e7eb;
       /* subtle border */
       border-radius: 10px;
       box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
       /* soft shadow */
       padding: 7px 0px;
       /* reduced padding for concise layout */
       transition: transform 0.2s ease, box-shadow 0.2s ease;
     }
 
     .kpi-card:hover {
       transform: translateY(-1px);
       box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
     }
 
     .kpi-card.uptime,
     .kpi-card.cpu,
     .kpi-card.memory,
     .kpi-card.swap,
     .kpi-card.load {
       border: 2px solid black;
       /* same accent color for all */
     }
 
     .kpi-value {
       font-size: 20px;
       font-weight: 700;
       margin: 0.5rem 0;
       text-align: center;
     }
 
     .kpi-label {
       border: none;
       border-radius: 0%;
       font-size: small;
       border-bottom: 1px solid black;
       font-family: 'Inter', 'Roboto', 'Segoe UI', sans-serif;
     }
 
     .kpi-icon {
       font-size: 1.5rem;
       opacity: 0.8;
     }
 
     .properties-btn {
       background: #667eea;
       color: white;
       border: none;
       border-radius: 8px;
       padding: 0.6rem 1.2rem;
       font-weight: 600;
       cursor: pointer;
       transition: background 0.3s ease;
       display: flex;
       align-items: center;
       gap: 0.5rem;
     }
 
     .properties-btn:hover {
       background: #5568d3;
     }
 
     .properties-modal {
       display: none;
       position: fixed;
       z-index: 2000;
       left: 0;
       top: 0;
       width: 100%;
       height: 100%;
       overflow: auto;
       background-color: rgba(0, 0, 0, 0.5);
     }
 
     .properties-modal-content {
       background-color: #fff;
       margin: 5% auto;
       padding: 2rem;
       border-radius: 12px;
       width: 90%;
       max-width: 700px;
       box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
       height: 70%;
     }
 
     .properties-grid {
       display: grid;
       grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
       gap: 1rem;
       margin-top: 1rem;
       height: 80%;
       overflow: auto;
     }
 
     .property-item {
       background: #f7fafc;
       padding: 0.75rem;
       border-radius: 8px;
       border: 2px solid black;
     }
 
     .property-label {
       font-size: 0.75rem;
       color: #718096;
       text-transform: uppercase;
       font-weight: 600;
     }
 
     .property-value {
       font-size: 0.95rem;
       color: #2d3748;
       font-weight: 500;
       margin-top: 0.25rem;
     }
 
     #processTable th {
       cursor: pointer;
       user-select: none;
     }
 
     #processTable th:hover {
       background-color: #F9FAFB;
     }
 
     .chart-group-label {
       writing-mode: vertical-rl;
       transform: rotate(180deg);
       text-align: center;
       font-weight: 600;
       color: #4A5568;
       background-color: #F7FAFC;
       padding: 0.5rem;
       border-radius: 12px;
       letter-spacing: 0.1em;
       text-transform: uppercase;
       font-size: 0.9rem;
     }
 
     .collapsible-header {
       cursor: pointer;
       padding: 1rem;
       background-color: #fff;
       border-radius: 12px;
       transition: all 0.3s ease-in-out;
       display: flex;
       align-items: center;
       justify-content: center;
     }
 
     .collapsible-content {
       display: grid;
       grid-template-rows: 0fr;
       transition: grid-template-rows 0.5s ease-in-out;
     }
 
     .collapsible-content>div {
       overflow: hidden;
     }
 
     .collapsible-section.is-expanded .collapsible-content {
       grid-template-rows: 1fr;
       padding: 10px;
     }
 
     .header-title {
       display: block;
     }
 
     .header-icon {
       display: none;
     }
 
     .collapsible-section.is-expanded .header-title {
       display: none;
     }
 
     .collapsible-section.is-expanded .header-icon {
       display: block;
     }
 
     .process-row {
       cursor: pointer;
     }
 
     .process-detail-row {
       background-color: #f9fafb;
     }
 
     .command-cell {
       cursor: pointer;
       color: #2563eb;
     }
 
     .command-cell:hover {
       text-decoration: underline;
     }
 
     .modal {
       display: none;
       position: fixed;
       z-index: 1000;
       left: 0;
       top: 0;
       width: 100%;
       height: 100%;
       overflow: auto;
       background-color: rgba(0, 0, 0, 0.4);
     }
 
     .modal-content {
       background-color: #fefefe;
       margin: 15% auto;
       padding: 20px;
       border: 1px solid #888;
       border-radius: 8px;
       width: 80%;
       max-width: 600px;
     }
 
     .close {
       color: #aaa;
       float: right;
       font-size: 28px;
       font-weight: bold;
       cursor: pointer;
     }
 
     .close:hover,
     .close:focus {
       color: #000;
     }
 
     .justify-center {
       justify-content: center;
     }
 
     .controls-container {
       display: flex;
       justify-content: space-between;
       align-items: flex-end;
     }
 
     .flex-container {
       display: flex;
       flex-direction: column;
     }
 
     ::-webkit-scrollbar-track {
       background-color: #e5e7eb;
     }
 
     ::-webkit-scrollbar-thumb {
       background-color: #6d8e94;
     }
 
     ::-webkit-scrollbar {
       width: 6px;
       height: 6px;
     }
 
     ::-webkit-scrollbar-thumb {
       border-radius: 3px;
     }
 
   </style>
 </head>
 
 <body class="bg-gray-100">
   <div class="max-w-7xl mx-auto p-2 sm:p-6">
     <header class="bg-white shadow-md rounded-xl p-2 mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
       <div class="flex items-center">
         <img src="${absoluteImagePath}" alt="Infrastructure Icon" class="h-12 w-12 mr-4">
         <div>
           <h1 class="text-2xl sm:text-3xl font-bold text-gray-800">Infrastructure Performance</h1>
           <p class="text-gray-500 text-sm mt-1">Real-time infrastructure monitoring report</p>
         </div>
       </div>
       <div class="flex-container">
         <span class="text-sm text-gray-500 mt-2 sm:mt-0">Generated: ${new Date().toLocaleString()}</span>
       </div>
     </header>
 
     <section class="bg-white shadow-md rounded-xl p-3 mb-2 controls-container">
       <div class="filter-bar">
         <div class="filter-card">
           <label class="filter-label">IP Address</label>
           <select id="ipFilter"></select>
         </div>
       </div>
       <button id="propertiesBtn" class="properties-btn">
         <i class="fas fa-info-circle"></i>
         Properties
       </button>
     </section>
 
     <section class="mb-2">
       <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
         <div class="kpi-card uptime">
           <div class=" flex justify-center">
             <div class="kpi-label">Uptime</div>
           </div>
           <div class="kpi-value" id="kpi-uptime">--</div>
         </div>
         <div class="kpi-card cpu">
           <div class="flex justify-center">
             <div class="kpi-label">CPU Usage</div>
           </div>
           <div class="kpi-value" id="kpi-cpu">--%</div>
         </div>
         <div class="kpi-card memory">
           <div class="flex justify-center">
             <div class="kpi-label">Memory Usage</div>
           </div>
           <div class="kpi-value" id="kpi-memory">--GB</div>
         </div>
         <div class="kpi-card swap">
           <div class="flex justify-center">
             <div class="kpi-label">Swap Usage</div>
           </div>
           <div class="kpi-value" id="kpi-swap">--MB</div>
         </div>
         <div class="kpi-card load">
           <div class="flex justify-center">
             <div class="kpi-label">Load Average</div>
           </div>
           <div class="kpi-value" id="kpi-load">--%</div>
         </div>
       </div>
     </section>
 
     <section class="collapsible-section bg-white shadow-md rounded-xl p-2 mb-2">
       <div class="collapsible-header">
         <h2 class="header-title text-xl font-semibold text-gray-700">Host Metrics</h2>
         <div class="header-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none"
             viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
           </svg></div>
       </div>
       <div class="collapsible-content">
         <div>
           <div class="flex gap-4 pt-6">
             <div class="hidden md:flex items-center justify-center">
               <div class="chart-group-label">Infra Metrics</div>
             </div>
             <div class="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <div class="card w-33">
                 <div class="card-header chart-title d-flex justify-content-between align-items-center">
                   <span>CPU Usage</span>
                 </div>
                 <div id="avgCpuUsageChart" class="bg-white border border-gray-200 chart-card"
                   data-chart-type="avgCpuUsageData"></div>
               </div>
               <div class="card w-33">
                 <div class="card-header chart-title d-flex justify-content-between align-items-center">
                   <span>Memory Usage</span>
                 </div>
                 <div id="memoryRamChart" class="bg-white border border-gray-200  chart-card"
                   data-chart-type="memoryRamData"></div>
               </div>
               <div class="card w-33">
                 <div class="card-header chart-title d-flex justify-content-between align-items-center">
                   <span>Swap Usage</span>
                 </div>
                 <div id="memorySwapChart" class="bg-white border border-gray-200 chart-card"
                   data-chart-type="memorySwapData"></div>
               </div>
             </div>
           </div>
           <div class="bg-white border border-gray-200 rounded-xl p-4 mt-3">
             <h3 class="text-lg font-semibold text-gray-700 mb-3">Process Details</h3>
             <div class="overflow-x-auto" style="max-height: 500px; overflow-y: auto;">
               <table id="processTable" class="w-full text-xs border-collapse">
                 <thead class="bg-gray-50 border sticky top-0 z-10">
                   <tr class="bg-white border">
                     <th class="border px-3 py-2 text-left" data-sort-key="key">Process Name<span
                         class="sort-icon"></span></th>
                     <th class="border px-3 py-2 text-left" data-sort-key="currentProcessCount">Process Count<span
                         class="sort-icon"></span></th>
                     <th class="border px-3 py-2 text-left" data-sort-key="state">State<span class="sort-icon"></span>
                     </th>
                     <th class="border px-3 py-2 text-left" data-sort-key="total_cpu_percent">CPU(%)<span
                         class="sort-icon"></span></th>
                     <th class="border px-3 py-2 text-left" data-sort-key="total_memory_percent">Memory(%)<span
                         class="sort-icon"></span></th>
                     <th class="border px-3 py-2 text-left" data-sort-key="pid">PID<span class="sort-icon"></span></th>
                     <th class="border px-3 py-2 text-left" data-sort-key="ppid">PPID<span class="sort-icon"></span></th>
                   </tr>
                 </thead>
                 <tbody id="processTableBody"></tbody>
               </table>
             </div>
           </div>
         </div>
       </div>
     </section>
     <section class="collapsible-section bg-white shadow-md rounded-xl p-2 mb-2">
       <div class="collapsible-header">
         <h2 class="header-title text-xl font-semibold text-gray-700">Network Metrics</h2>
         <div class="header-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none"
             viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
           </svg></div>
       </div>
       <div class="collapsible-content">
         <div>
           <div class="flex gap-4 pt-6">
             <div class="hidden md:flex items-center justify-center">
               <div class="chart-group-label">Network Metrics</div>
             </div>
             <div class="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
               <div class="card w-33">
                 <div class="card-header chart-title d-flex justify-content-between align-items-center">
                   <span>Network Status</span>
                 </div>
                 <div id="networkStatusChart" class="bg-white border border-gray-200  p-2 chart-card"
                   data-chart-type="networkStatusData"></div>
               </div>
               <div class="card w-33">
                 <div class="card-header chart-title d-flex justify-content-between align-items-center">
                   <span>Network Bandwidth Usage</span>
                 </div>
                 <div id="networkBandwidthUsageChart" class="bg-white border border-gray-200  p-2 chart-card"
                   data-chart-type="networkBandwidthData"></div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </section>
     <section class="collapsible-section bg-white shadow-md rounded-xl p-2 mb-2">
       <div class="collapsible-header">
         <h2 class="header-title text-xl font-semibold text-gray-700">Disk File Metrics</h2>
         <div class="header-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none"
             viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
           </svg></div>
       </div>
       <div class="collapsible-content">
         <div>
           <div class="flex gap-4 pt-6">
             <div class="hidden md:flex items-center justify-center">
               <div class="chart-group-label">Disk File Metrics</div>
             </div>
             <div class="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <div class="card w-33">
                 <div class="card-header chart-title d-flex justify-content-between align-items-center">
                   <span>File System Mountpoint Usage</span>
                 </div>
                 <div id="fileSystemMountpointUsageChart" class="bg-white border border-gray-200  p-2 chart-card"
                   data-chart-type="fileSystemData"></div>
               </div>
               <div class="card w-33">
                 <div class="card-header chart-title d-flex justify-content-between align-items-center">
                   <span>File Descriptor Usage</span>
                 </div>
                 <div id="fileFdChart" class="bg-white border border-gray-200 p-2 chart-card"
                   data-chart-type="fileFdData"></div>
               </div>
               <div class="card w-33">
                 <div class="card-header chart-title d-flex justify-content-between align-items-center">
                   <span>Disk Read/Write</span>
                 </div>
                 <div id="diskReadWriteChart" class="bg-white border border-gray-200  p-2 chart-card"
                   data-chart-type="diskIoData"></div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </section>
   </div>
 
   <div id="commandModal" class="modal">
     <div class="modal-content"><span class="close">&times;</span>
       <h3 class="text-lg font-semibold mb-3">Full Command</h3>
       <p id="commandText" class="break-all text-sm"></p>
     </div>
   </div>
   <div id="propertiesModal" class="properties-modal">
     <div class="properties-modal-content">
       <div class="flex justify-between items-center mb-4">
         <h3 class="text-2xl font-bold text-gray-800">Host Properties</h3><span
           class="close text-3xl cursor-pointer text-gray-500 hover:text-gray-800">&times;</span>
       </div>
       <div id="propertiesContent" class="properties-grid"></div>
     </div>
   </div>
 
   <script>
     // Data will be injected here
     %%REPORT_PAYLOAD_SCRIPT_BLOCK%%
 
     // Global state variables
     let currentIp = '';
     let processSortKey = 'key';
     let processSortDirection = 'asc';
     let expandedProcesses = {};
 
     // ============================================================================
     // CHART RENDERING FUNCTIONS
     // ============================================================================
     function renderAvgCpuUsageChart(containerId, data) {
       try {
         if (!data || data.length === 0 || data.every(d => Object.keys(d).length <= 1)) {
           document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
           return;
         }
         const keys = Array.from(
           new Set(data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket')))
         );
         const colorMap = { user: '#00798c', system: '#bbd0ff', idle: '#76c893', iowait: '#7d8597', nice: '#b388eb', irq: '#45ba6a', softirq: '#2348eb', steal: '#492e69' };
         function parseTimeBucket(timeBucket) {
           const str = String(timeBucket);
           const year = parseInt(str.substring(0, 4)), month = parseInt(str.substring(4, 6)) - 1,
             day = parseInt(str.substring(6, 8)), hour = parseInt(str.substring(8, 10)),
             minute = parseInt(str.substring(10, 12));
           return new Date(Date.UTC(year, month, day, hour, minute)).getTime();
         }
         const series = keys.map(key => ({
           name: key,
           color: colorMap[key] || undefined,
           data: data.map(d => ({
             x: parseTimeBucket(d.time_bucket),
             y: typeof d[key] === 'number' ? d[key] : null
           })),
           type: 'line',
           marker: { radius: 2, symbol: 'circle' },
           lineWidth: 1.5
         }));
         Highcharts.chart(containerId, {
           chart: { type: 'line', backgroundColor: 'transparent', height: '50%' },
           title: { text: null },
           xAxis: {
             type: 'datetime',
             crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
             labels: {
               style: {
                 fontSize: '9px' // <-- Adjust X-axis font size here
               }
             }
           },
           yAxis: {
             min: 0,
             title: { text: 'Usage (%)' },
             labels: {
               style: {
                 fontSize: '9px' // <-- Adjust Y-axis font size here
               }
             }
           },
           tooltip: { shared: true, xDateFormat: '%Y-%m-%d %H:%M', valueSuffix: ' %' },
           legend: {
             enabled: true,
             itemStyle: {
               fontSize: '9px' // <-- Adjust legend font size here
             }
           },
           series: series,
           credits: { enabled: false }
         });
       } catch (e) {
         console.error("Error rendering Average CPU Usage chart:", e);
         document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-red-500 p-6">Error rendering chart</p></div>';
       }
     }
 
     function renderMemoryRamChart(containerId, data, thresholds = {}, selectedSeriesKey = 'all') {
       try {
         if (!data || data.length === 0 || data.every(d => Object.keys(d).length <= 1)) {
           document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
           return;
         }
         const CRITICAL_COLOR = 'red';
         const WARNING_COLOR = 'orange';
         const metricMap = { meter_vm_memory_total: 'total', meter_vm_memory_available: 'available', meter_vm_memory_buff_cache: 'buff_cache', meter_vm_memory_used: 'used' };
         const metricKeys = Object.keys(metricMap);
         const defaultColors = { meter_vm_memory_total: '#023e8a', meter_vm_memory_available: '#480ca8', meter_vm_memory_buff_cache: '#679436', meter_vm_memory_used: '#5390d9' };
 
         function parseTimeBucket(timeBucket) {
           const str = String(timeBucket);
           const year = parseInt(str.substring(0, 4)), month = parseInt(str.substring(4, 6)) - 1,
             day = parseInt(str.substring(6, 8)), hour = parseInt(str.substring(8, 10)),
             minute = parseInt(str.substring(10, 12));
           return new Date(Date.UTC(year, month, day, hour, minute)).getTime();
         }
 
         const series = metricKeys.map(key => ({
           name: metricMap[key], type: 'spline', color: defaultColors[key], marker: { radius: 2 },
           data: data.map(d => {
             const valueMB = typeof d[key] === 'number' ? d[key] : null;
             if (valueMB === null) return { x: parseTimeBucket(d.time_bucket), y: null };
             let status = '';
             let markerColor = defaultColors[key];
             const threshold = thresholds[key];
             if (threshold) {
               const warningMB = threshold.warningValue / (1024 * 1024);
               const criticalMB = threshold.criticalValue / (1024 * 1024);
               if (criticalMB > 0 && valueMB >= criticalMB) { status = 'C'; markerColor = CRITICAL_COLOR; }
               else if (warningMB > 0 && valueMB >= warningMB) { status = 'W'; markerColor = WARNING_COLOR; }
             }
             return { x: parseTimeBucket(d.time_bucket), y: valueMB, status: status, marker: { fillColor: markerColor, lineColor: markerColor } };
           })
         }));
 
         Highcharts.chart(containerId, {
           chart: { type: 'line', backgroundColor: 'transparent', height: '50%' },
           credits: { enabled: false },
           title: { text: null },
           xAxis: {
             type: 'datetime',
             crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
             labels: {
               style: {
                 fontSize: '9px' // <-- Adjust X-axis font size
               }
             }
           },
           yAxis: {
             min: 0,
             title: { text: 'MB' },
             labels: {
               style: {
                 fontSize: '9px' // <-- Adjust Y-axis font size
               }
             }
           },
           tooltip: {
             shared: true,
             useHTML: true,
             xDateFormat: '%Y-%m-%d %H:%M',
             formatter: function () {
               let tooltipHtml = '<b>' + Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x) + '</b><br/>';
               this.points.forEach(p => {
                 const point = p.point;
                 const statusColor = point.status === 'C' ? CRITICAL_COLOR : (point.status === 'W' ? WARNING_COLOR : '');
                 tooltipHtml += '<span style="color:' + p.series.color + '">●</span> ' + p.series.name + ': ' + (point.y ? point.y.toFixed(2) : 'N/A') + ' MB ' + (point.status ? '<span style="color:' + statusColor + '">(' + point.status + ')</span>' : '') + '<br/>';
               });
               return tooltipHtml;
             }
           },
           legend: {
             enabled: true,
             itemStyle: {
               fontSize: '9px' // <-- Adjust legend font size
             }
           },
           series: series
         });
       } catch (e) {
         console.error("Error rendering Memory RAM Chart:", e);
         document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-red-500 p-6">Error rendering chart</p></div>';
       }
     }
 
     function renderMemorySwapChart(containerId, data, thresholds = {}, selectedSeriesKey = 'all') {
       try {
         if (!data || data.length === 0 || data.every(d => Object.keys(d).length <= 1)) {
           document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
           return;
         }
 
         const CRITICAL_COLOR = 'red';
         const WARNING_COLOR = 'orange';
         const swapMetricMap = { meter_vm_memory_swap_total: 'total', meter_vm_memory_swap_free: 'free', meter_vm_memory_swap_used: 'used' };
         const swapMetricKeys = Object.keys(swapMetricMap);
         const defaultColors = { meter_vm_memory_swap_total: '#6BAED6', meter_vm_memory_swap_free: '#74C476', meter_vm_memory_swap_used: '#FD8D3C' };
 
         function parseTimeBucket(timeBucket) {
           const str = String(timeBucket);
           const year = parseInt(str.substring(0, 4)), month = parseInt(str.substring(4, 6)) - 1,
             day = parseInt(str.substring(6, 8)), hour = parseInt(str.substring(8, 10)),
             minute = parseInt(str.substring(10, 12));
           return new Date(Date.UTC(year, month, day, hour, minute)).getTime();
         }
 
         const series = swapMetricKeys.map(key => ({
           name: swapMetricMap[key], type: 'areaspline', color: defaultColors[key], fillOpacity: 0.3, marker: { radius: 2 },
           data: data.map(d => {
             let valueMB = null;
             if (key === 'meter_vm_memory_swap_used') {
               if (d['meter_vm_memory_swap_total'] != null && d['meter_vm_memory_swap_free'] != null)
                 valueMB = d['meter_vm_memory_swap_total'] - d['meter_vm_memory_swap_free'];
             } else if (d[key] != null) {
               valueMB = d[key];
             }
             if (valueMB === null) return { x: parseTimeBucket(d.time_bucket), y: null };
             return { x: parseTimeBucket(d.time_bucket), y: valueMB, status: '', marker: { fillColor: defaultColors[key], lineColor: defaultColors[key] } };
           })
         }));
 
         Highcharts.chart(containerId, {
           chart: { type: 'areaspline', backgroundColor: 'transparent', height: '50%' },
           credits: { enabled: false },
           title: { text: null },
           xAxis: {
             type: 'datetime',
             crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
             labels: {
               style: {
                 fontSize: '9px' // <-- Set X-axis font size
               }
             }
           },
           yAxis: {
             min: 0,
             title: { text: 'MB' },
             labels: {
               style: {
                 fontSize: '9px' // <-- Set Y-axis font size
               }
             }
           },
           tooltip: {
             shared: true,
             useHTML: true,
             xDateFormat: '%Y-%m-%d %H:%M',
             formatter: function () {
               let tooltipHtml = '<b>' + Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x) + '</b><br/>';
               this.points.forEach(p => {
                 tooltipHtml += '<span style="color:' + p.series.color + '">●</span> ' + p.series.name + ': ' + (p.point.y ? p.point.y.toFixed(2) : 'N/A') + ' MB<br/>';
               });
               return tooltipHtml;
             }
           },
           legend: {
             enabled: true,
             itemStyle: {
               fontSize: '9px' // <-- Set legend font size
             }
           },
           series: series
         });
       } catch (e) {
         console.error("Error rendering Memory Swap Chart:", e);
         document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-red-500 p-6">Error rendering chart</p></div>';
       }
     }
 
     function renderNetworkStatusChart(containerId, data) {
       try {
         if (!data || data.length === 0 || data.every(d => Object.keys(d).length <= 1)) {
           document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
           return;
         }
         const keyMap = { meter_vm_tcp_curr_estab: 'tcp_curr_estab', meter_vm_sockets_used: 'sockets_used', meter_vm_tcp_tw: 'tcp_tw', meter_vm_tcp_alloc: 'tcp_alloc', meter_vm_udp_inuse: 'udp_inuse' };
         const keysToDisplay = Object.keys(keyMap);
         const colorMap = { meter_vm_tcp_curr_estab: '#00798c', meter_vm_sockets_used: '#70a288', meter_vm_tcp_tw: '#76c893', meter_vm_tcp_alloc: '#7d8597', meter_vm_udp_inuse: '#45ba6a' };
         function parseTimeBucket(timeBucket) {
           const str = String(timeBucket);
           const year = parseInt(str.substring(0, 4)), month = parseInt(str.substring(4, 6)) - 1, day = parseInt(str.substring(6, 8)),
             hour = parseInt(str.substring(8, 10)), minute = parseInt(str.substring(10, 12));
           return new Date(Date.UTC(year, month, day, hour, minute)).getTime();
         }
         const series = keysToDisplay.map(key => ({
           name: keyMap[key], color: colorMap[key] || undefined,
           data: data.map(d => ({ x: parseTimeBucket(d.time_bucket), y: typeof d[key] === 'number' ? d[key] : null })),
           type: 'spline', marker: { radius: 2 }, lineWidth: 1
         }));
         Highcharts.chart(containerId, {
           chart: { type: 'spline', backgroundColor: 'transparent', height: '45%' },
           title: { text: null },
           xAxis: {
             type: 'datetime',
             crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
             labels: { style: { fontSize: '9px' } }
           },
           yAxis: {
             min: 0,
             tickAmount: 6,
             title: { text: 'Count' },
             labels: { style: { fontSize: '9px' } }
           },
           tooltip: { shared: true, xDateFormat: '%Y-%m-%d %H:%M' },
           legend: {
             enabled: true,
             itemStyle: {
               fontSize: '9px' // <-- Added for consistent legend font size
             }
           },
           series: series,
           credits: { enabled: false }
         });
       } catch (e) {
         console.log("Error rendering network status chart:", e);
         document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-red-500 p-6">Error rendering chart</p></div>';
       }
     }
 
     function renderNetworkBandwidthChart(containerId, data, thresholds = {}, selectedSeriesKey = 'all') {
       try {
         if (!data || data.length === 0 || data.every(d => Object.keys(d).length <= 1)) {
           document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
           return;
         }
         const CRITICAL_COLOR = 'red';
         const WARNING_COLOR = 'orange';
         const networkKeyMap = { meter_vm_network_receive: 'network_receive', meter_vm_network_transmit: 'network_transmit' };
         const defaultColors = { meter_vm_network_receive: '#7dc8fe', meter_vm_network_transmit: '#7d8597' };
 
         function parseTimeBucket(timeBucket) {
           const str = String(timeBucket);
           const year = parseInt(str.substring(0, 4)), month = parseInt(str.substring(4, 6)) - 1, day = parseInt(str.substring(6, 8)),
             hour = parseInt(str.substring(8, 10)), minute = parseInt(str.substring(10, 12));
           return new Date(Date.UTC(year, month, day, hour, minute)).getTime();
         }
 
         const series = Object.keys(networkKeyMap).map(key => {
           return {
             name: networkKeyMap[key], type: 'spline', color: defaultColors[key], marker: { radius: 2 },
             data: data.map(d => ({
               x: parseTimeBucket(d.time_bucket),
               y: (d[key] ?? 0),
               status: '',
               marker: { fillColor: defaultColors[key], lineColor: defaultColors[key], radius: 2 }
             }))
           };
         });
 
         Highcharts.chart(containerId, {
           chart: { type: 'line', backgroundColor: 'transparent', height: '45%' },
           title: { text: null },
           credits: { enabled: false },
           xAxis: {
             type: 'datetime',
             crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
             labels: {
               style: {
                 fontSize: '9px' // <-- Added for X-axis font size
               }
             }
           },
           yAxis: {
             min: 0,
             title: { text: 'KB/s' },
             labels: {
               style: {
                 fontSize: '9px' // <-- Added for Y-axis font size
               }
             }
           },
           tooltip: {
             shared: true,
             useHTML: true,
             xDateFormat: '%Y-%m-%d %H:%M',
             formatter: function () {
               let tooltipHtml = '<b>' + Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x) + '</b><br/>';
               this.points.forEach(p => {
                 tooltipHtml += '<span style="color:' + p.series.color + '">●</span> ' + p.series.name + ': ' + p.point.y.toFixed(2) + ' KB/s<br/>';
               });
               return tooltipHtml;
             }
           },
           legend: {
             enabled: true,
             itemStyle: {
               fontSize: '9px' // <-- Added for legend font size
             }
           },
           series: series
         });
       } catch (e) {
         console.error("Error rendering Network Bandwidth Chart:", e);
         document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-red-500 p-6">Error rendering chart</p></div>';
       }
     }
 
     function renderFileSystemChart(containerId, data) {
       try {
         if (!data || data.length === 0 || data.every(d => Object.keys(d).length <= 1)) {
           document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
           return;
         }
         const keys = Array.from(new Set(data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))));
         const lineColors = ['#73946B', '#3E5F44', '#8AA624', '#568F87', '#647FBC', '#556B2F'];
 
         function parseTimeBucket(timeBucket) {
           const str = String(timeBucket);
           const year = parseInt(str.substring(0, 4)), month = parseInt(str.substring(4, 6)) - 1, day = parseInt(str.substring(6, 8)),
             hour = parseInt(str.substring(8, 10)), minute = parseInt(str.substring(10, 12));
           return new Date(Date.UTC(year, month, day, hour, minute)).getTime();
         }
 
         const series = keys.map((key, index) => ({
           name: key,
           data: data.map(d => ({ x: parseTimeBucket(d.time_bucket), y: typeof d[key] === 'number' ? d[key] : null })),
           type: 'line', color: lineColors[index % lineColors.length], marker: { symbol: 'circle', radius: 1 }, lineWidth: 1
         }));
 
         Highcharts.chart(containerId, {
           chart: { type: 'spline', backgroundColor: 'transparent', height: '50%' },
           title: { text: null },
           xAxis: {
             type: 'datetime',
             crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
             labels: { style: { fontSize: '9px' } } // <-- Changed to 9px
           },
           yAxis: {
             min: 0,
             tickAmount: 6,
             title: { text: 'Usage (%)' },
             labels: { style: { fontSize: '9px' } } // <-- Changed to 9px
           },
           tooltip: { shared: true, xDateFormat: '%Y-%m-%d %H:%M' },
           legend: {
             enabled: true,
             itemStyle: {
               fontSize: '9px' // <-- Added and set to 9px
             }
           },
           series: series,
           credits: { enabled: false }
         });
       } catch (e) {
         console.log("Error rendering file system chart:", e);
         document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-red-500 p-6">Error rendering chart</p></div>';
       }
     }
 
     function renderFileFDChart(containerId, data) {
       try {
         if (!data || data.length === 0 || data.every(d => Object.keys(d).length <= 1)) {
           document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
           return;
         }
         const keyMap = { 'meter_vm_filefd_allocated': 'filefd_allocated' };
         const keysToDisplay = Object.keys(keyMap);
 
         function parseTimeBucket(timeBucket) {
           const str = String(timeBucket);
           const year = parseInt(str.substring(0, 4)), month = parseInt(str.substring(4, 6)) - 1, day = parseInt(str.substring(6, 8)),
             hour = parseInt(str.substring(8, 10)), minute = parseInt(str.substring(10, 12));
           return new Date(Date.UTC(year, month, day, hour, minute)).getTime();
         }
 
         const series = keysToDisplay.map(key => ({
           name: keyMap[key],
           data: data.map(d => ({ x: parseTimeBucket(d.time_bucket), y: typeof d[key] === 'number' ? d[key] : null })),
           type: 'areaspline', marker: { radius: 2 }, color: '#7dc8fe', fillOpacity: 0.3, lineWidth: 1
         }));
 
         Highcharts.chart(containerId, {
           chart: { type: 'area', backgroundColor: 'transparent', height: '50%' },
           title: { text: null },
           xAxis: {
             type: 'datetime',
             crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
             labels: { style: { fontSize: '9px' } } // <-- Changed to 9px
           },
           yAxis: {
             min: 0,
             tickAmount: 6,
             title: { text: 'Count' },
             labels: { style: { fontSize: '9px' } } // <-- Changed to 9px
           },
           tooltip: { shared: true, xDateFormat: '%Y-%m-%d %H:%M' },
           legend: {
             enabled: true,
             itemStyle: {
               fontSize: '9px' // <-- Added and set to 9px
             }
           },
           series: series,
           credits: { enabled: false }
         });
       } catch (e) {
         console.log("Error rendering filefd allocated chart:", e);
         document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-red-500 p-6">Error rendering chart</p></div>';
       }
     }
 
     function renderDiskReadWriteChart(containerId, data) {
       try {
         if (!data || data.length === 0 || data.every(d => Object.keys(d).length <= 1)) {
           document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
           return;
         }
         const keyMap = { meter_vm_disk_read: 'disk_read', meter_vm_disk_written: 'disk_written' };
         const keysToDisplay = Object.keys(keyMap);
         const defaultColors = { meter_vm_disk_read: '#f3fd3c', meter_vm_disk_written: '#FD8D3C' };
 
         function parseTimeBucket(timeBucket) {
           const str = String(timeBucket);
           const year = parseInt(str.substring(0, 4)), month = parseInt(str.substring(4, 6)) - 1, day = parseInt(str.substring(6, 8)),
             hour = parseInt(str.substring(8, 10)), minute = parseInt(str.substring(10, 12));
           return new Date(Date.UTC(year, month, day, hour, minute)).getTime();
         }
 
         const series = keysToDisplay.map(key => ({
           name: keyMap[key],
           data: data.map(d => ({ x: parseTimeBucket(d.time_bucket), y: typeof d[key] === 'number' ? d[key] : null })),
           type: 'areaspline', marker: { radius: 2 }, color: defaultColors[key], fillOpacity: 0.3, lineWidth: 1
         }));
 
         Highcharts.chart(containerId, {
           chart: { type: 'area', backgroundColor: 'transparent', height: '50%' },
           title: { text: null },
           xAxis: {
             type: 'datetime',
             crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
             labels: { style: { fontSize: '9px' } } // <-- Changed to 9px
           },
           yAxis: {
             min: 0,
             tickAmount: 6,
             title: { text: 'Operations/sec' },
             labels: { style: { fontSize: '9px' } } // <-- Changed to 9px
           },
           tooltip: { shared: true, xDateFormat: '%Y-%m-%d %H:%M', valueSuffix: ' iops' },
           legend: {
             enabled: true,
             itemStyle: {
               fontSize: '9px' // <-- Added and set to 9px
             }
           },
           series: series,
           credits: { enabled: false }
         });
       } catch (e) {
         console.log("Error rendering disk read/write chart:", e);
         document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-red-500 p-6">Error rendering chart</p></div>';
       }
     }
 
 
     const chartRenderers = {
       avgCpuUsageData: (id, data) => renderAvgCpuUsageChart(id, data),
       memoryRamData: (id, data) => renderMemoryRamChart(id, data),
       memorySwapData: (id, data) => renderMemorySwapChart(id, data),
       networkStatusData: (id, data) => renderNetworkStatusChart(id, data),
       networkBandwidthData: (id, data) => renderNetworkBandwidthChart(id, data),
       fileSystemData: (id, data) => renderFileSystemChart(id, data),
       fileFdData: (id, data) => renderFileFDChart(id, data),
       diskIoData: (id, data) => renderDiskReadWriteChart(id, data),
     };
 
 
     document.addEventListener('DOMContentLoaded', () => {
       const ipFilter = document.getElementById('ipFilter');
       const propertiesModal = document.getElementById('propertiesModal');
       const commandModal = document.getElementById('commandModal');
 
       function populateIpFilter() {
         if (!reportPayload || !reportPayload.ips || reportPayload.ips.length === 0) {
           ipFilter.innerHTML = '<option>No IPs found</option>';
           return;
         }
         ipFilter.innerHTML = reportPayload.ips.map(ip => '<option value="' + ip + '">' + ip + '</option>').join('');
         currentIp = reportPayload.ips[0];
       }
 
       function renderReportForIp(ip) {
         currentIp = ip;
         expandedProcesses = {};
 
         const dataForIp = reportPayload.dataByIp[ip];
         if (!dataForIp) {
           console.error('No data found for selected IP:', ip);
           updateKPIs(null);
           renderProcessTable(null);
           document.querySelectorAll('.chart-card').forEach(c => c.innerHTML = '<p class="text-gray-500">No Data Available</p>');
           return;
         }
 
         updateKPIs(dataForIp.kpiData);
         renderProcessTable(dataForIp.processTableData);
 
         document.querySelectorAll('.collapsible-section.is-expanded').forEach(section => {
           renderChartsForSection(section, dataForIp);
         });
         // Ensure charts in non-expanded sections are marked as not rendered yet
         document.querySelectorAll('.collapsible-section:not(.is-expanded)').forEach(section => {
           section.querySelectorAll('.chart-card').forEach(c => c.innerHTML = '');
         });
       }
 
       function updateKPIs(kpiData) {
         if (!kpiData) {
           document.getElementById('kpi-uptime').textContent = '--';
           document.getElementById('kpi-cpu').textContent = '--%';
           document.getElementById('kpi-memory').textContent = '--GB';
           document.getElementById('kpi-swap').textContent = '--MB';
           document.getElementById('kpi-load').textContent = '--%';
           return;
         }
         document.getElementById('kpi-uptime').textContent = kpiData.uptime || '--';
         document.getElementById('kpi-cpu').textContent = kpiData.cpu_usage != null ? kpiData.cpu_usage.toFixed(2) + '%' : '--%';
         document.getElementById('kpi-memory').textContent = kpiData.memory_usage != null ? (kpiData.memory_usage / 1024).toFixed(2) + 'GB' : '--GB';
         document.getElementById('kpi-swap').textContent = kpiData.swap_usage != null ? kpiData.swap_usage.toFixed(2) + 'MB' : '--MB';
         document.getElementById('kpi-load').textContent = kpiData.load_average != null ? kpiData.load_average.toFixed(2) + '%' : '--%';
       }
 
       function renderChartsForSection(section, dataForIp) {
         if (!dataForIp) return;
 
         section.querySelectorAll('.chart-card').forEach(chartContainer => {
           const chartType = chartContainer.dataset.chartType;
           const chartData = dataForIp[chartType];
           const renderer = chartRenderers[chartType];
 
           if (renderer && chartData && chartData.some(d => Object.keys(d).length > 1)) {
             renderer(chartContainer.id, chartData);
           } else {
             chartContainer.innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
           }
         });
       }
 
       function renderProcessTable(processData) {
         const tbody = document.getElementById('processTableBody');
         if (!tbody || !processData || Object.keys(processData).length === 0) {
           tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No Process Data Available</td></tr>';
           return;
         }
 
         const sortedKeys = Object.keys(processData).sort((a, b) => {
           let valA, valB;
           const procA = processData[a];
           const procB = processData[b];
 
           if (processSortKey === 'key') { valA = a; valB = b; }
           else if (processSortKey === 'state') { valA = procA.processes[0]?.state || ''; valB = procB.processes[0]?.state || ''; }
           else if (processSortKey === 'pid') { valA = procA.processes[0]?.pid || 0; valB = procB.processes[0]?.pid || 0; }
           else if (processSortKey === 'ppid') { valA = procA.processes[0]?.ppid || 0; valB = procB.processes[0]?.ppid || 0; }
           else { valA = procA[processSortKey]; valB = procB[processSortKey]; }
 
           let comparison = 0;
           if (typeof valA === 'string') { comparison = valA.localeCompare(valB); }
           else { comparison = parseFloat(valA) - parseFloat(valB); }
 
           return processSortDirection === 'asc' ? comparison : -comparison;
         });
 
         let html = '';
         sortedKeys.forEach(key => {
           const proc = processData[key];
           const isExpanded = expandedProcesses[key];
 
           html += '<tr class="bg-white border-b odd:bg-gray-50 hover:bg-gray-100 process-row" data-process-key="' + key + '">' +
                        '<td class="border px-3 py-2"><i class="fas ' + (isExpanded ? 'fa-caret-down' : 'fa-caret-right') + ' mr-2"></i>' + key + '</td>' +
                        '<td class="border px-3 py-2">' + proc.currentProcessCount + '</td>' +
                        '<td class="border px-3 py-2">' + (proc.processes[0]?.state || 'N/A') + '</td>' +
                        '<td class="border px-3 py-2">' + proc.total_cpu_percent + '</td>' +
                        '<td class="border px-3 py-2">' + proc.total_memory_percent + '</td>' +
                        '<td class="border px-3 py-2">' + (proc.isMultiplePID ? 'MULTIPLE' : proc.processes[0]?.pid) + '</td>' +
                        '<td class="border px-3 py-2">' + (proc.isMultiplePPID ? 'MULTIPLE' : proc.processes[0]?.ppid) + '</td>' +
                      '</tr>';
 
           if (isExpanded) {
             proc.processes.forEach(process => {
               const safeCommand = (process.command || '').replace(/"/g, '&quot;');
               const shortCommand = safeCommand.length > 20 ? safeCommand.slice(0, 20) + '...' : safeCommand;
               html += '<tr class="process-detail-row border-b">' +
                                '<td class="border px-3 py-2 pl-12 command-cell" data-command="' + safeCommand + '">' + shortCommand + '</td>' +
                                '<td class="border px-3 py-2"></td>' +
                                '<td class="border px-3 py-2">' + process.state + '</td>' +
                                '<td class="border px-3 py-2">' + process.cpu_percent + '</td>' +
                                '<td class="border px-3 py-2">' + process.memory_percent + '</td>' +
                                '<td class="border px-3 py-2">' + process.pid + '</td>' +
                                '<td class="border px-3 py-2">' + process.ppid + '</td>' +
                              '</tr>';
             });
           }
         });
 
         tbody.innerHTML = html;
         updateProcessSortIcons();
       }
 
       function updateProcessSortIcons() {
         document.querySelectorAll('#processTable th').forEach(th => {
           const key = th.dataset.sortKey;
           const icon = th.querySelector('.sort-icon');
           if (icon) {
             icon.innerHTML = '';
             if (key === processSortKey) {
               icon.innerHTML = processSortDirection === 'asc' ? ' <i class="fas fa-arrow-up text-gray-700"></i>' : ' <i class="fas fa-arrow-down text-gray-700"></i>';
             }
           }
         });
       }
 
       // --- EVENT LISTENERS ---
       ipFilter.addEventListener('change', (e) => {
         renderReportForIp(e.target.value);
       });
 
       document.querySelectorAll('.collapsible-header').forEach(header => {
         header.addEventListener('click', () => {
           const section = header.closest('.collapsible-section');
           section.classList.toggle('is-expanded');
           if (section.classList.contains('is-expanded')) {
             renderChartsForSection(section, reportPayload.dataByIp[currentIp]);
           }
         });
       });
 
       document.getElementById('propertiesBtn').onclick = () => {
         const props = reportPayload.dataByIp[currentIp]?.hostProperties;
         if (!props || Object.keys(props).length === 0) {
           alert('Host properties are not available for the selected IP.');
           return;
         }
         const content = document.getElementById('propertiesContent');
         const labels = { 'hostname': 'Hostname', 'os_version': 'OS Version', 'kernel_version': 'Kernel Version', 'system_uptime': 'System Uptime', 'logical_cores': 'Logical Cores', 'product_name': 'Product Name', 'system_vendor': 'System Vendor', 'board_vendor': 'Board Vendor', 'board_name': 'Board Name', 'bios_vendor': 'BIOS Vendor', 'bios_version': 'BIOS Version', 'chassis_vendor': 'Chassis Vendor' };
         let html = '';
         for (const [key, value] of Object.entries(props)) {
           const label = labels[key] || key.replace(/_/g, ' ').toUpperCase();
           html += '<div class="property-item"><div class="property-label">' + label + '</div><div class="property-value">' + (value || 'N/A') + '</div></div>';
         }
         content.innerHTML = html;
         propertiesModal.style.display = 'block';
       };
 
       document.querySelector('#processTable thead').addEventListener('click', (e) => {
         const header = e.target.closest('th');
         if (!header || !header.dataset.sortKey) return;
         const key = header.dataset.sortKey;
         if (key === processSortKey) {
           processSortDirection = processSortDirection === 'asc' ? 'desc' : 'asc';
         } else {
           processSortKey = key;
           processSortDirection = 'asc';
         }
         renderProcessTable(reportPayload.dataByIp[currentIp]?.processTableData);
       });
 
       document.getElementById('processTableBody').addEventListener('click', (e) => {
         const row = e.target.closest('.process-row');
         if (row) {
           const key = row.dataset.processKey;
           expandedProcesses[key] = !expandedProcesses[key];
           renderProcessTable(reportPayload.dataByIp[currentIp]?.processTableData);
         }
         const commandCell = e.target.closest('.command-cell');
         if (commandCell) {
           document.getElementById('commandText').textContent = commandCell.dataset.command;
           commandModal.style.display = 'block';
         }
       });
 
       // Modal close listeners
       [propertiesModal, commandModal].forEach(modal => {
         modal.querySelector('.close').onclick = () => { modal.style.display = 'none'; };
       });
       window.onclick = (e) => {
         if (e.target === propertiesModal) propertiesModal.style.display = 'none';
         if (e.target === commandModal) commandModal.style.display = 'none';
       };
 
       // --- INITIALIZATION ---
       populateIpFilter();
       if (currentIp) {
         renderReportForIp(currentIp);
       }
     });
   </script>
 </body>
 
 </html>
 `;
   }
}
