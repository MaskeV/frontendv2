import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApmReportService {

  constructor() { }

  public getApmHtmlTemplate(): string {
    const baseUrl = window.location.origin;
    const absoluteImagePath = `${baseUrl}/assets/images/favicon.png`;
    return `
<!DOCTYPE html>
<html lang="en">
 
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>APM Performance Report</title>
  <link rel="icon" type="image/png" href="${absoluteImagePath}" />
  
  <link rel="stylesheet" href="${baseUrl}/assets/css/tailwind.min.css">

  <script src="${baseUrl}/assets/js/highcharts.js"></script>
  <script src="${baseUrl}/assets/js/highcharts-more.js"></script>
  <script src="${baseUrl}/assets/js/sankey.js"></script>
  <script src="${baseUrl}/assets/js/solid-gauge.js"></script>
  <script src="${baseUrl}/assets/js/organization.js"></script>


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
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    .metric-box {
      background: #f9fafb;
      border-radius: 6px;
      padding: 8px;
      min-width: 14%;
      border: 1px solid transparent;
    }

    .metric-box .small {
      font-size: 11px;
      color: #374151;
      font-weight: 500;
    }

    .metric-box .kpi-value {
      font-size: 20px;
      font-weight: 700;
    }

    .metric-box .mini-text {
      font-size: 11px;
      font-weight: 600;
    }

    .threshold {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #fff;
      border: 1px solid currentColor;
      margin-left: 6px;
      display: inline-block;
    }

    .hidden {
      display: none;
    }

    .kpi-card {
      background: #f9fafb;
      border: 1px solid transparent;
      border-radius: 10px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      padding: 7px 0px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .kpi-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
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
      
    .justify-center {
      justify-content: center;
    }

    /* RCA Table Styling */
    #rcaSection table {
      border-collapse: collapse;
      width: 100%;
      font-size: 12px;
    }

    #rcaSection th {
      background-color: #F3F4F6;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    #rcaSection th,
    #rcaSection td {
      border: 1px solid #E5E7EB;
      padding: 8px;
    }

    #rcaSection tbody tr:hover {
      background-color: #F9FAFB;
    }

    /* Status colors */
    .status-warning {
      color: #E07E23;
      font-weight: 600;
    }

    .status-critical {
      color: #DC2626;
      font-weight: 700;
    }

    ::-webkit-scrollbar-track {
      background-color: #e5e7eb;
    }

    ::-webkit-scrollbar-thumb {
      background-color: #6d8e94;
      border-radius: 3px;
    }

    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

.topology-wrapper {
  width: 100%;
  max-width: 900px;
  min-height: 600px;
  margin: 0 auto;
  background: #f8fafc;
}

.topology-container {
  width: 100%;
  height: 100%;
  background: white;
  border: 1px solid #e2e8f0;
  overflow: auto;
}

#orgChartContainer {
  width: 100%;
  height: 100%;
}

/* Node */
.compact-node {
  color: #000 !important;
  text-align: center;
  font-family: sans-serif;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2px;
}

.compact-node b {
  color: #000 !important;
  font-size: 11px;
}

/* Title */
.node-title {
  font-weight: 700;
  font-size: 10px;
  margin-bottom: 2px;
  color: #000;

  width: 95%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

/* KPI row */
.node-kpi-row {
  font-size: 9px;
  line-height: 1;
  color: #374151;
  font-weight: 500;
}

/* Links */
.highcharts-link {
  stroke: #cbd5e1 !important;
}

.highcharts-node {
  stroke-width: 1px;
}

/* Link labels */
.highcharts-link-label text {
  font-size: 9px !important;
  fill: #000 !important;
  font-weight: bold !important;
}

.highcharts-link-label-box {
  fill: rgba(255, 255, 255, 0.9);
  stroke: #cbd5e1;
  stroke-width: 0.5px;
}

/* Tooltip */
.custom-tooltip {
  background: white;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  font-size: 11px;
  color: black;
}

@media (max-width: 768px) {
  .topology-container,
  #topologyContainer {
    overflow-x: auto;
    overflow-y: hidden;
  }

  #topologyContainer {
    min-width: 900px; /* force horizontal scroll */
  }
}

  </style>
</head>

<body class="bg-gray-100">
  <div class="max-w-7xl mx-auto p-2 sm:p-6">

    <header class="bg-white shadow-md rounded-xl p-2 mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center">
        <img src="${absoluteImagePath}" alt="APM Icon" class="h-12 w-12 mr-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-800">APM Performance</h1>
          <p class="text-gray-600 text-sm mt-1 font-semibold" id="header-app-name">Application: --</p>
        </div>
      </div>

      <div class="flex flex-col text-right">
        <span class="text-sm text-gray-500">Generated: <span id="header-generated-at">--</span></span>
        <span class="text-sm text-gray-500">Start: <span id="header-start-time">--</span></span>
        <span class="text-sm text-gray-500">End: <span id="header-end-time">--</span></span>
      </div>
    </header>

    <section class="mb-2">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div class="metric-box" id="kpi-successRate-box">
          <div class="small">
            Success rate
            <span id="kpi-successRate-threshold" class="badge border rounded-0 py-0 px-1 threshold"> --</span>
          </div>

          <div class="fw-bold kpi-value" id="kpi-successRate-value">
            -- <span class="mini-text">%</span>
          </div>
        </div>


        <div class="metric-box" id="kpi-apdex-box">
          <div class="small">
            Apdex
            <span id="kpi-apdex-threshold" class="badge border rounded-0 py-0 px-1 threshold"> --</span>
          </div>

          <div class="fw-bold kpi-value" id="kpi-apdex-value">
            -- <span class="mini-text"></span>
          </div>
        </div>

        <div class="metric-box" id="kpi-latency-box">
          <div class="small">
            Latency
            <span id="kpi-latency-threshold" class="badge border rounded-0 py-0 px-1 threshold"> --</span>
          </div>

          <div class="fw-bold kpi-value" id="kpi-latency-value">
            -- <span class="mini-text">ms</span>
          </div>
        </div>

        <div class="metric-box" id="kpi-load-box">
          <div class="small">
            Load
            <span id="kpi-load-threshold" class="badge border rounded-0 py-0 px-1 threshold"> --</span>
          </div>

          <div class="fw-bold kpi-value" id="kpi-load-value">
            -- <span class="mini-text">call/min</span>
          </div>
        </div>

        <div class="kpi-card totalHit">
          <div class="flex justify-center">
            <div class="kpi-label">Total Hits</div>
          </div>
          <div class="kpi-value" id="kpi-totalHit">--</div>
        </div>
        
        <div class="kpi-card errorHit">
          <div class="flex justify-center">
            <div class="kpi-label">Error</div>
          </div>
          <div class="kpi-value" id="kpi-errorHit">--</div>
        </div>
      </div>
    </section>

    <section class="collapsible-section bg-white shadow-md rounded-xl p-2 mb-2">
      <div class="collapsible-header">
        <h2 class="header-title text-xl font-semibold text-gray-700">Topology</h2>
        <div class="header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </div>

      <div class="collapsible-content">
        <div class="pt-4 overflow-x-auto">
          <div class="topology-wrapper">
            <div class="topology-container">
              <div id="topologyContainer"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="collapsible-section bg-white shadow-md rounded-xl p-2 mb-2">
      <div class="collapsible-header">
        <h2 class="header-title text-xl font-semibold text-gray-700">Overview Metrics</h2>
        <div class="header-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </div>
      <div class="collapsible-content">
        <div>
          <div class="flex gap-4 pt-6">
            <div class="hidden md:flex items-center justify-center">
              <div class="chart-group-label">Performance Metrics</div>
            </div>
            <div style = "width: 100%;">
              <div class="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="card w-33">
                  <div class="card-header chart-title">
                    <span>Success Rate (%)</span>

                    <div class="flex items-center gap-1 text-xs">
                      <select class="border rounded px-1 py-0.5 text-xs" onchange="toggleMetaData('sr', this.value)">
                        <option value="avg" selected>Average</option>
                        <option value="threshold">Threshold</option>
                      </select>

                      <!-- AVG -->
                      <div id="sr-avg" class="rounded px-1 font-bold" style="color:#0e38f1; background:#eef2ff;">
                        --
                      </div>

                      <!-- THRESHOLD -->
                      <div id="sr-warn" class="hidden rounded px-1 font-bold" style="color:#e07e23; background:#fff7ed;">
                        --
                      </div>

                      <div id="sr-critical" class="hidden rounded px-1 font-bold text-red-600" style="background:#fff1f2;">
                        --
                      </div>
                    </div>
                  </div>

                  <div id="successRateData" class="bg-white border border-gray-200 chart-card"
                    data-chart-type="successRateData"></div>
                </div>
                <div class="card w-33">
                  <div class="card-header chart-title">
                    <span>Apdex</span>

                    <div class="flex items-center gap-1 text-xs">
                      <select class="border rounded px-1 py-0.5 text-xs" onchange="toggleMetaData('apdex', this.value)">
                        <option value="avg" selected>Average</option>
                        <option value="threshold">Threshold</option>
                      </select>

                      <!-- AVG -->
                      <div id="apdex-avg" class="rounded px-1 font-bold" style="color:#0e38f1; background:#eef2ff;">
                        --
                      </div>

                      <!-- THRESHOLD -->
                      <div id="apdex-warn" class="hidden rounded px-1 font-bold" style="color:#e07e23; background:#fff7ed;">
                        --
                      </div>

                      <div id="apdex-critical" class="hidden rounded px-1 font-bold text-red-600" style="background:#fff1f2;">
                        --
                      </div>
                    </div>
                  </div>

                  <div id="apdexData" class="bg-white border border-gray-200  chart-card"
                    data-chart-type="apdexData"></div>
                </div>
                <div class="card w-33">
                  <div class="card-header chart-title">
                    <span>Load (call/min)</span>

                    <div class="flex items-center gap-1 text-xs">
                      <select class="border rounded px-1 py-0.5 text-xs" onchange="toggleMetaData('load', this.value)">
                        <option value="avg" selected>Average</option>
                        <option value="threshold">Threshold</option>
                      </select>

                      <!-- AVG -->
                      <div id="load-avg" class="rounded px-1 font-bold" style="color:#0e38f1; background:#eef2ff;">
                        --
                      </div>

                      <!-- THRESHOLD -->
                      <div id="load-warn" class="hidden rounded px-1 font-bold" style="color:#e07e23; background:#fff7ed;">
                        --
                      </div>

                      <div id="load-critical" class="hidden rounded px-1 font-bold text-red-600" style="background:#fff1f2;">
                        --
                      </div>
                    </div>
                  </div>
                  <div id="loadData" class="bg-white border border-gray-200 chart-card"
                    data-chart-type="loadData"></div>
                </div>
                <div class="card w-33">
                  <div class="card-header chart-title">
                    <span>Latency (ms)</span>

                    <div class="flex items-center gap-1 text-xs">
                      <select class="border rounded px-1 py-0.5 text-xs" onchange="toggleMetaData('latency', this.value)">
                        <option value="avg" selected>Average</option>
                        <option value="threshold">Threshold</option>
                      </select>

                      <!-- AVG -->
                      <div id="latency-avg" class="rounded px-1 font-bold" style="color:#0e38f1; background:#eef2ff;">
                        --
                      </div>

                      <!-- THRESHOLD -->
                      <div id="latency-warn" class="hidden rounded px-1 font-bold" style="color:#e07e23; background:#fff7ed;">
                        --
                      </div>

                      <div id="latency-critical" class="hidden rounded px-1 font-bold text-red-600" style="background:#fff1f2;">
                        --
                      </div>
                    </div>
                  </div>
                  <div id="latencyData" class="bg-white border border-gray-200 chart-card"
                    data-chart-type="latencyData"></div>
                </div>
                <div class="card w-33">
                  <div class="card-header chart-title">
                    <span>Latency Percentile</span>
                  </div>
                  <div id="latencyPercentileData" class="bg-white border border-gray-200 chart-card"
                    data-chart-type="latencyPercentileData"></div>
                </div>
              </div>
              <div class="mt-3 overflow-x-auto">
                <table class="min-w-full text-xs text-center border border-gray-200">
                  <thead class="bg-gray-100 text-gray-700">
                    <tr>
                      <th rowspan="2" class="border px-2 py-1">Timestamp</th>

                      <th rowspan="2" class="border px-2 py-1">
                        Success Rate
                        <div class="flex items-center justify-center gap-1 text-[10px] mt-1">
                          <select onchange="toggleMetaData('srTable', this.value)">
                            <option value="avg" selected>Avg</option>
                            <option value="threshold">Th</option>
                          </select>
                          <span style = "color: blue;" id="srTable-avg">--</span>
                          <span style = "color: orange;" id="srTable-warn" class="hidden">--</span>
                          <span style = "color: brown;" id="srTable-critical" class="hidden">--</span>
                        </div>
                      </th>

                      <th rowspan="2" class="border px-2 py-1">
                        Apdex
                        <div class="flex items-center justify-center gap-1 text-[10px] mt-1">
                          <select onchange="toggleMetaData('apdexTable', this.value)">
                            <option value="avg" selected>Avg</option>
                            <option value="threshold">Th</option>
                          </select>
                          <span style = "color: blue;" id="apdexTable-avg">--</span>
                          <span style = "color: orange;" id="apdexTable-warn" class="hidden">--</span>
                          <span style = "color: brown;" id="apdexTable-critical" class="hidden">--</span>
                        </div>
                      </th>

                      <th rowspan="2" class="border px-2 py-1">
                        Load
                        <div class="flex items-center justify-center gap-1 text-[10px] mt-1">
                          <select onchange="toggleMetaData('loadTable', this.value)">
                            <option value="avg" selected>Avg</option>
                            <option value="threshold">Th</option>
                          </select>
                          <span style = "color: blue;" id="loadTable-avg">--</span>
                          <span style = "color: orange;" id="loadTable-warn" class="hidden">--</span>
                          <span style = "color: brown;" id="loadTable-critical" class="hidden">--</span>
                        </div>
                      </th>

                      <th rowspan="2" class="border px-2 py-1">
                        Latency
                        <div class="flex items-center justify-center gap-1 text-[10px] mt-1">
                          <select onchange="toggleMetaData('latencyTable', this.value)">
                            <option value="avg" selected>Avg</option>
                            <option value="threshold">Th</option>
                          </select>
                          <span style = "color: blue;" id="latencyTable-avg">--</span>
                          <span style = "color: orange;" id="latencyTable-warn" class="hidden">--</span>
                          <span style = "color: brown;" id="latencyTable-critical" class="hidden">--</span>
                        </div>
                      </th>
                  
                      <th colspan="5" class="border px-2 py-1">Latency Percentile</th>
                    </tr>

                    <tr>
                      <th class="border px-2 py-1">P50</th>
                      <th class="border px-2 py-1">P75</th>
                      <th class="border px-2 py-1">P90</th>
                      <th class="border px-2 py-1">P95</th>
                      <th class="border px-2 py-1">P99</th>
                    </tr>
                  </thead>
                  <tbody id="metricsTableBody"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="collapsible-section bg-white shadow-md rounded-xl p-2 mb-2">
      <div class="collapsible-header">
        <h2 class="header-title text-xl font-semibold text-gray-700">DB Metrics</h2>
        <div class="header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </div>

      <div class="collapsible-content">
        <div>
          <div class="flex gap-4 pt-6">
            <div class="hidden md:flex items-center justify-center">
              <div class="chart-group-label">DB Metrics</div>
            </div>

            <!-- RIGHT SIDE -->
            <div class="flex-grow">

              <!-- 🔹 DROPDOWN ROW -->
              <div class="mb-4">
                <label class="text-sm font-semibold text-gray-600 mr-2">Select Database:</label>
                <select id="dbIpSelect" class="border rounded px-2 py-1 text-sm"></select>
              </div>

              <!-- 🔹 CHARTS GRID -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="card w-33">
                  <div class="card-header chart-title">
                    <span>Success Rate</span>
                  </div>
                  <div id="dbSlaChart" class="bg-white border border-gray-200 chart-card"></div>
                </div>

                <div class="card w-33">
                  <div class="card-header chart-title">
                    <span>Load</span>
                  </div>
                  <div id="dbCpmChart" class="bg-white border border-gray-200 chart-card"></div>
                </div>

                <div class="card w-33">
                  <div class="card-header chart-title">
                    <span>Latency</span>
                  </div>
                  <div id="dbAvgResChart" class="bg-white border border-gray-200 chart-card"></div>
                </div>

                <div class="card w-33">
                  <div class="card-header chart-title">
                    <span>Latency</span>
                  </div>
                  <div id="dbAvgResPercentileChart" class="bg-white border border-gray-200 chart-card"></div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>


    <section class="collapsible-section bg-white shadow-md rounded-xl p-2 mb-2">
      <div class="collapsible-header">
        <h2 class="header-title text-xl font-semibold text-gray-700">RCA Problems</h2>
        <div class="header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </div>

      <div id="rcaSection" class="collapsible-content">
        <div>
          <div class="flex gap-4 pt-6">
            <div class="hidden md:flex items-center justify-center">
              <div class="chart-group-label">RCA Problems</div>
            </div>

            <!-- RIGHT SIDE -->
            <div class="flex-grow">

            <div class="pt-4 overflow-x-auto">
              <table class="min-w-full text-sm text-left border border-gray-200">
                <thead class="bg-gray-100 text-gray-600">
                  <tr>
                    <th class="px-3 py-2 border">Alert Name</th>
                    <th class="px-3 py-2 border">Metric</th>
                    <th class="px-3 py-2 border">Status</th>
                    <th class="px-3 py-2 border">Warning Value</th>
                    <th class="px-3 py-2 border">Critical Value</th>
                    <th class="px-3 py-2 border">Problem Status</th>
                    <th class="px-3 py-2 border">Start Time</th>
                    <th class="px-3 py-2 border">End Time</th>
                    <th class="px-3 py-2 border">Trigger Count</th>
                  </tr>
                </thead>
                <tbody id="rcaTableBody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>



    <section id="rcaSection" class="collapsible-section bg-white shadow-md rounded-xl p-2 mb-2 hidden">
      <div class="collapsible-header">
        <h2 class="header-title text-xl font-semibold text-gray-700">RCA Problems</h2>
      </div>

      <div class="collapsible-content">
        <div class="pt-4 overflow-x-auto">
          <table class="min-w-full text-sm text-left border border-gray-200">
            <thead class="bg-gray-100 text-gray-600">
              <tr>
                <th class="px-3 py-2 border">Alert Name</th>
                <th class="px-3 py-2 border">Metric</th>
                <th class="px-3 py-2 border">Status</th>
                <th class="px-3 py-2 border">Warning Value</th>
                <th class="px-3 py-2 border">Critical Value</th>
                <th class="px-3 py-2 border">Problem Status</th>
                <th class="px-3 py-2 border">Start Time</th>
                <th class="px-3 py-2 border">End Time</th>
                <th class="px-3 py-2 border">Trigger Count</th>
              </tr>
            </thead>
            <tbody id="rcaTableBody"></tbody>
          </table>
        </div>
      </div>
    </section>

  </div>

  <script>
    // Data will be injected here
    %%REPORT_PAYLOAD_SCRIPT_BLOCK%%

    // Global state variables
    let currentApp = '';
    let currentDbIp = null;

    // ============================================================================
    // CHART RENDERING FUNCTIONS
    // ============================================================================

    function parseTimeBucket(bucket) {
      const str = String(bucket);

      const year = +str.slice(0, 4);
      const month = +str.slice(4, 6) - 1;
      const day = +str.slice(6, 8);

      let hour = 0;
      let minute = 0;

      if (str.length >= 10) {
        hour = +str.slice(8, 10);
      }
      if (str.length >= 12) {
        minute = +str.slice(10, 12);
      }

      return new Date(Date.UTC(year, month, day, hour, minute)).getTime();
    }

    function formatTimeBucketToReadable(bucket) {
      if (!bucket) return "--";

      const str = String(bucket);

      const year = str.slice(0, 4);
      const month = str.slice(4, 6);
      const day = str.slice(6, 8);

      let hour = "00";
      let minute = "00";

      if (str.length >= 10) hour = str.slice(8, 10);
      if (str.length >= 12) minute = str.slice(10, 12);

      return year + "-" + month + "-" + day + " " + hour + ":" + minute;
    }

    function noDataHtml() {
      return '<div class="flex items-center justify-center h-full">' + '<p class="text-center text-gray-500 p-6">No Data Available</p>' + '</div>';
    }


    function renderHeaderInfo(appName, dataForApm) {
      document.getElementById("header-app-name").innerText = "Application: " + appName;
      document.getElementById("header-generated-at").innerText = new Date().toLocaleString();

      // If you passed st & et in payload
      if (dataForApm?.meta) {
        if (dataForApm.meta.startTime)
          document.getElementById("header-start-time").innerText = formatTimeBucketToReadable(dataForApm.meta.startTime);
      
        if (dataForApm.meta.endTime)
          document.getElementById("header-end-time").innerText = formatTimeBucketToReadable(dataForApm.meta.endTime);
      }
    }

    function renderMetricMeta(metricKey, avgValue, thresholds, unit) {
      unit = unit || '';

      const avgEl = document.getElementById(metricKey + '-avg');
      const warnEl = document.getElementById(metricKey + '-warn');
      const criticalEl = document.getElementById(metricKey + '-critical');

      if (avgEl && avgValue != null) {
        avgEl.innerText = Number(avgValue).toFixed(2) + unit;
      }

      if (thresholds) {
        if (warnEl && thresholds.warningValue != null) {
          warnEl.innerText = Number(thresholds.warningValue).toFixed(2) + unit;
        }

        if (criticalEl && thresholds.criticalValue != null) {
          criticalEl.innerText = Number(thresholds.criticalValue).toFixed(2) + unit;
        }
      }
    }

    function getThresholdDisplay(thresholds, metric, actualValue) {
      if (!thresholds || !thresholds[metric] || actualValue == null) {
        return { value: null, color: '#3A8754' };
      }

      const t = thresholds[metric];
      let displayValue = t.warningValue;
      let color = '#3A8754';

      if (metric === 'service_resp_time' || metric === 'service_cpm') {
        if (actualValue >= t.criticalValue) {
          displayValue = t.criticalValue;
          color = 'red';
        } else if (actualValue >= t.warningValue) {
          displayValue = t.warningValue;
          color = 'orange';
        }
      }
      else if (metric === 'service_apdex' || metric === 'service_sla') {
        if (actualValue < t.criticalValue) {
          displayValue = t.criticalValue;
          color = 'red';
        } else if (actualValue < t.warningValue) {
          displayValue = t.warningValue;
          color = 'orange';
        }
      }

      return { value: displayValue, color };
    }

    function updateKpi(prefix, value, metricKey, thresholds, unit = '') {
      const valueEl = document.getElementById(prefix + '-value');
      const boxEl = document.getElementById(prefix + '-box');
      const badgeEl = document.getElementById(prefix + '-threshold');

      if (!valueEl || !boxEl || !badgeEl) return;

      const numericValue = Number(value);
        
      if (isNaN(numericValue)) {
        valueEl.innerHTML = "--";
        badgeEl.style.display = "none";
        return;
      }
        
      const display = getThresholdDisplay(thresholds, metricKey, numericValue);
        
      valueEl.innerHTML = numericValue.toFixed(2) + unit;
      valueEl.style.color = display.color;

      valueEl.innerHTML = value.toFixed(2) + unit;
      valueEl.style.color = display.color;

      if (display.value != null) {
        badgeEl.innerText = display.value.toFixed(2) + unit;
        badgeEl.style.display = 'inline-block';
        badgeEl.style.color = display.color === 'red' ? 'red' : 'orange';
      } else {
        badgeEl.style.display = 'none';
      }

      boxEl.style.border =
        display.color === 'red' || display.color === 'orange'
          ? '1px solid ' + display.color
          : '';
    }

    function renderKpis(dataForApm) {
      if (!dataForApm || !dataForApm.kpis) return;

      const kpis = dataForApm.kpis;
      const thresholds = dataForApm.thresholds?.thresholdData;

      updateKpi('kpi-successRate', kpis.successRateAvg, 'service_sla', thresholds, ' %');
      updateKpi('kpi-apdex', kpis.apdexAvg, 'service_apdex', thresholds);
      updateKpi('kpi-load', kpis.loadAvg, 'service_cpm', thresholds, ' call/min');
      updateKpi('kpi-latency', kpis.latencyAvg, 'service_resp_time', thresholds, ' ms');

      if (document.getElementById('kpi-totalHit') && kpis.totalHit != null)
        document.getElementById('kpi-totalHit').innerText = kpis.totalHit;

      if (document.getElementById('kpi-errorHit') && kpis.errorHit != null)
        document.getElementById('kpi-errorHit').innerText = kpis.errorHit;
    }

    function getPointColor(metricKey, y, thresholds) {
      if (!thresholds || y == null) return undefined;

      const t = thresholds[metricKey];
      if (!t) return undefined;

      // Higher is worse
      if (metricKey === 'service_resp_time' || metricKey === 'service_cpm') {
        if (t.criticalValue != null && y >= t.criticalValue) return 'red';
        if (t.warningValue != null && y >= t.warningValue) return 'orange';
      }

      // Lower is worse
      if ( metricKey === 'service_apdex' ||  metricKey === 'service_sla') {
        if (t.criticalValue != null && y < t.criticalValue) return 'red';
        if (t.warningValue != null && y < t.warningValue) return 'orange';
      }

      return undefined;
    }

    function timeAxis() {
      return {
        type: 'datetime',
        crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
        labels: { style: { fontSize: '9px' } }
      };
    }

    function valueAxis(title, avgValue) {
      return {
        title: { text: title },
        labels: { style: { fontSize: '9px' } },
        plotLines: avgValue != null ? [{
          value: avgValue,
          color: '#7B4019',
          width: 2,
          dashStyle: 'Dash',
          zIndex: 5
        }] : []
      };
    }

    function tooltipConfig(unit) {
      unit = unit || '';
      return {
        shared: true,
        xDateFormat: '%Y-%m-%d %H:%M',
        formatter: function () {
          var s = '<b>' +
            Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x) +
            '</b><br/>';

          this.points.forEach(function (p) {
            s += '<span style="color:' + p.color + '">●</span> ' +
                 p.series.name + ': <b>' + p.y + unit + '</b><br/>';
          });

          return s;
        }
      };
    }

    function renderTimeSeriesChart({
      containerId,
      data,
      chartType = 'spline',
      yTitle = '',
      unit = '',
      metricKey = null,
      avgValue = null,
      thresholds = null
    }) {
      const el = document.getElementById(containerId);
      if (!el || !Array.isArray(data) || !data.length) {
        el.innerHTML = noDataHtml();
        return;
      }

      const keys = [...new Set(
        data.flatMap(d => Object.keys(d).filter(k => k !== 'timeBucket'))
      )];

      if (!keys.length) {
        el.innerHTML = noDataHtml();
        return;
      }

      const series = keys.map(key => ({
        name: key,
        type: chartType,
        data: data.map(d => {
          const y = d[key] != null ? Number(d[key]) : null;
          return {
            x: parseTimeBucket(d.timeBucket),
            y,
            color: metricKey
              ? getPointColor(metricKey, y, thresholds)
              : undefined
          };
        }),
        marker: { radius: 2 },
        lineWidth: 2,
        fillOpacity: chartType.includes('area') ? 0.3 : undefined
      }));

      Highcharts.chart(containerId, {
        chart: { type: chartType, backgroundColor: 'transparent', height: '50%' },
        title: { text: null },
        xAxis: timeAxis(),
        yAxis: {
          ...valueAxis(yTitle, avgValue),
          tickAmount: 6,
          min: 0
        },
        tooltip: tooltipConfig(unit),
        legend: { enabled: false },
        series,
        credits: { enabled: false },
        exporting: { enabled: false }
      });
    } 

    function renderSuccessRateChart(containerId, data, avgValue) {
      try {
        if (!Array.isArray(data) || data.length === 0 || !data.some(d => Object.keys(d).some(k => k !== 'timeBucket' && d[k] != null))) {
          document.getElementById(containerId).innerHTML ='<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
          return;
        }

        const keys = Array.from(
          new Set(data.flatMap(item => Object.keys(item).filter(k => k !== 'timeBucket')))
        );

        var series = [];
        
        keys.forEach(function (key) {
          series.push({
            type: 'column',
            name: 'Failure',
            stack: key,
            color: '#DC4245',
            showInLegend: false,
            data: data.map(function (d) {
              return {
                x: parseTimeBucket(d.timeBucket),
                y: d[key] != null ? 100 - Number(d[key]) : null
              };
            })
          });
          series.push({
            type: 'column',
            name: 'Success',
            stack: key,
            color: '#549958',
            data: data.map(function (d) {
              return {
                x: parseTimeBucket(d.timeBucket),
                y: d[key] != null ? Number(d[key]) : null
              };
            })
          });
        });

        Highcharts.chart(containerId, {
          chart: { type: 'column', backgroundColor: 'transparent', height: '50%' },
          title: { text: null },
          xAxis: {
            type: 'datetime',
            crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
            labels: {
              style: {
                fontSize: '9px'
              }
            }
          },
          yAxis: {
            min: 0,
            max: 100,
            tickAmount: 6,
            title: { text: 'Success Rate (%)' },
            labels: {
              style: {
                fontSize: '9px'
              }
            },
            plotLines: avgValue != null ? [{
              value: avgValue,
              color: '#7B4019',
              width: 2,
              dashStyle: 'Dash',
              zIndex: 5,
            }] : []
          },
          tooltip: {
            shared: true,
            xDateFormat: '%Y-%m-%d %H:%M',
            valueSuffix: ' %',
            formatter: function () {
              var s = '<b>' + Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x) + '</b><br/>';

              this.points.forEach(function (point) {
                s +=
                  '<span style="color:' + point.color + '">●</span> ' + 
                  point.series.name + ': <b>' + point.y + '%</b><br/>';
              });

              if (avgValue != null) {
                s +=
                  '<span style="color:#7B4019">●</span> Baseline: <b>' +
                  avgValue +
                  '%</b><br/>';
              }

              return s;
            }
          },
          legend: { enabled: false},
          series: series,
          credits: { enabled: false },
          exporting: { enabled: false },
          plotOptions: {
            column: {
              stacking: 'normal',
              maxPointWidth: 10,
              grouping: true,
              borderWidth: 0
            }
          }
        });
      } catch (e) {
        console.error("Error rendering chart:", e);
        document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-red-500 p-6">Error rendering chart</p></div>';
      }
    }

    const chartRenderers = {
      successRateData: (containerId, data, avgValue) =>
        renderSuccessRateChart(containerId, data, avgValue),

      apdexData: (containerId, data, avgValue) =>
        renderTimeSeriesChart({ containerId, data, chartType: 'spline', yTitle: 'Apdex', metricKey: 'service_apdex', avgValue, thresholds: reportPayload.dataByApm[currentApp]?.thresholds?.thresholdData}),

      loadData: (containerId, data, avgValue) =>
        renderTimeSeriesChart({ containerId, data, chartType: 'spline', yTitle: 'Load (call/min)', unit: ' call/min', metricKey: 'service_cpm', avgValue, thresholds: reportPayload.dataByApm[currentApp]?.thresholds?.thresholdData}),

      latencyData: (containerId, data, avgValue) =>
        renderTimeSeriesChart({ containerId, data, chartType: 'areaspline', yTitle: 'Latency (ms)', unit: ' ms', metricKey: 'service_resp_time', avgValue, thresholds: reportPayload.dataByApm[currentApp]?.thresholds?.thresholdData}),

      latencyPercentileData: (containerId, data) =>
        renderTimeSeriesChart({ containerId, data, chartType: 'areaspline', yTitle: 'Latency Percentile (ms)', unit: ' ms'})
    };

    const chartAvgKeyMap = {
      successRateData: 'successRateAvg',
      apdexData: 'apdexAvg',
      loadData: 'loadAvg',
      latencyData: 'latencyAvg'
    };

    function toggleMetaData(metricKey, mode) {
      const avg = document.getElementById(metricKey + '-avg');
      const warn = document.getElementById(metricKey + '-warn');
      const critical = document.getElementById(metricKey + '-critical');

      if (!avg || !warn || !critical) return;

      if (mode === 'avg') {
        avg.classList.remove('hidden');
        warn.classList.add('hidden');
        critical.classList.add('hidden');
      } else {
        avg.classList.add('hidden');
        warn.classList.remove('hidden');
        critical.classList.remove('hidden');
      }
    }

    function buildMetricsTable(dataForApm) {
      const map = new Map();

      function add(arr, key) {
        (arr || []).forEach(d => {
          if (!d.timeBucket) return;

          if (!map.has(d.timeBucket)) {
            map.set(d.timeBucket, { timeBucket: d.timeBucket });
          }

          map.get(d.timeBucket)[key] = d.value ?? null;
        });
      }

      add(dataForApm.successRateData, 'successRate');
      add(dataForApm.apdexData, 'apdex');
      add(dataForApm.loadData, 'load');
      add(dataForApm.latencyData, 'latency');

      (dataForApm.latencyPercentileData || []).forEach(p => {
        if (!p.timeBucket) return;

        if (!map.has(p.timeBucket)) {
          map.set(p.timeBucket, { timeBucket: p.timeBucket });
        }

        const row = map.get(p.timeBucket);
        row.P50 = p.P50 ?? null;
        row.P75 = p.P75 ?? null;
        row.P90 = p.P90 ?? null;
        row.P95 = p.P95 ?? null;
        row.P99 = p.P99 ?? null;
      });

      return Array.from(map.values()).sort((a, b) =>
        a.timeBucket.localeCompare(b.timeBucket)
      );
    }

    function renderMetricsTable(dataForApm) {
      const tbody = document.getElementById("metricsTableBody");
      if (!tbody) return;

      const rows = buildMetricsTable(dataForApm);
      const thresholds = dataForApm.thresholds?.thresholdData;

      tbody.innerHTML = "";

      rows.forEach(r => {
        const tr = document.createElement("tr");

        function getStyle(metricKey, value) {
          const color = getPointColor(metricKey, value, thresholds);
          if (!color) return '';
          return 'style="background:' + (color === 'red' ? '#fd8484' : '#edaf61') + '; font-weight:600;"';
        }

        tr.innerHTML =
          '<td class="border px-2 py-1">' + formatTimeBucketToReadable(r.timeBucket) + '</td>' +

          '<td class="border px-2 py-1" ' + getStyle('service_sla', r.successRate) + '>' + (r.successRate ?? '--') + '</td>' +

          '<td class="border px-2 py-1" ' + getStyle('service_apdex', r.apdex) + '>' + (r.apdex ?? '--') + '</td>' +

          '<td class="border px-2 py-1" ' + getStyle('service_cpm', r.load) + '>' + (r.load ?? '--') + '</td>' +

          '<td class="border px-2 py-1" ' + getStyle('service_resp_time', r.latency) + '>' + (r.latency ?? '--') + '</td>' +

          '<td class="border px-2 py-1">' + (r.P50 ?? '--') + '</td>' +
          '<td class="border px-2 py-1">' + (r.P75 ?? '--') + '</td>' +
          '<td class="border px-2 py-1">' + (r.P90 ?? '--') + '</td>' +
          '<td class="border px-2 py-1">' + (r.P95 ?? '--') + '</td>' +
          '<td class="border px-2 py-1">' + (r.P99 ?? '--') + '</td>';

        tbody.appendChild(tr);
      });
    }


    function setTableMeta(dataForApm) {
      const k = dataForApm.kpis;
      const t = dataForApm.thresholds?.thresholdData;

      // AVG
      document.getElementById('srTable-avg').innerText = k.successRateAvg?.toFixed(2) + '%';
      document.getElementById('apdexTable-avg').innerText = k.apdexAvg?.toFixed(2);
      document.getElementById('loadTable-avg').innerText = k.loadAvg?.toFixed(2);
      document.getElementById('latencyTable-avg').innerText = k.latencyAvg?.toFixed(2) + ' ms';

      // THRESHOLD
      if (t) {
        document.getElementById('srTable-warn').innerText = t.service_sla?.warningValue ?? '--';
        document.getElementById('srTable-critical').innerText = t.service_sla?.criticalValue ?? '--';

        document.getElementById('apdexTable-warn').innerText = t.service_apdex?.warningValue ?? '--';
        document.getElementById('apdexTable-critical').innerText = t.service_apdex?.criticalValue ?? '--';

        document.getElementById('loadTable-warn').innerText = t.service_cpm?.warningValue ?? '--';
        document.getElementById('loadTable-critical').innerText = t.service_cpm?.criticalValue ?? '--';

        document.getElementById('latencyTable-warn').innerText = t.service_resp_time?.warningValue ?? '--';
        document.getElementById('latencyTable-critical').innerText = t.service_resp_time?.criticalValue ?? '--';
      }
    }


    document.addEventListener('DOMContentLoaded', () => {
      const apps = Object.keys(reportPayload.dataByApm);
      if (apps.length > 0) {
        currentApp = apps[0];
        renderReportForApm(currentApp);
      }

      function renderReportForApm(ip) {
        currentApp = ip;
        expandedProcesses = {};

        const dataForApm = reportPayload.dataByApm[ip];

        renderHeaderInfo(ip, dataForApm);

        renderKpis(dataForApm);
        renderMetricsTable(dataForApm);
        setTableMeta(dataForApm);

        renderMetricMeta('sr', dataForApm?.kpis?.successRateAvg, dataForApm?.thresholds?.thresholdData?.service_sla, '%');
        renderMetricMeta('apdex', dataForApm?.kpis?.apdexAvg, dataForApm?.thresholds?.thresholdData?.service_apdex);
        renderMetricMeta('load', dataForApm?.kpis?.loadAvg, dataForApm?.thresholds?.thresholdData?.service_cpm);
        renderMetricMeta('latency', dataForApm?.kpis?.latencyAvg, dataForApm?.thresholds?.thresholdData?.service_resp_time, ' ms');

        initDbDropdown(dataForApm);
        renderDbCharts(dataForApm);

        renderRcaTable(dataForApm);

        renderTopology(dataForApm.topology);

        document.querySelectorAll('.collapsible-section.is-expanded').forEach(section => {
          renderChartsForSection(section, dataForApm);
        });
        // Ensure charts in non-expanded sections are marked as not rendered yet
        document.querySelectorAll('.collapsible-section:not(.is-expanded)').forEach(section => {
          section.querySelectorAll('.chart-card').forEach(c => c.innerHTML = '');
        });
      }

      function renderChartsForSection(section, dataForApm) {
        if (!dataForApm) return;

        section.querySelectorAll('.chart-card').forEach(chartContainer => {
          const chartType = chartContainer.dataset.chartType;
          const chartData = dataForApm[chartType];
          const renderer = chartRenderers[chartType];

          if (!renderer || !Array.isArray(chartData)) {
            chartContainer.innerHTML =
              '<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
            return;
          }

          const avgKey = chartAvgKeyMap[chartType];
          const avgValue = avgKey ? dataForApm?.kpis?.[avgKey] : undefined;

          renderer(chartContainer.id, chartData, avgValue);
        });
      }

      function initDbDropdown(dataForApm) {
        const select = document.getElementById("dbIpSelect");
        if (!select || !dataForApm?.sourceAgg?.dbIps) return;

        const ips = dataForApm.sourceAgg.dbIps;

        select.innerHTML = "";

        ips.forEach(ip => {
          const opt = document.createElement("option");
          opt.value = ip;
          opt.textContent = ip;
          select.appendChild(opt);
        });

        // Default select first
        if (ips.length > 0) {
          currentDbIp = ips[0];
          select.value = currentDbIp;
        }

        // On change re-render charts
        select.onchange = () => {
          currentDbIp = select.value;
          renderDbCharts(dataForApm);
        };
      }

      function renderDbCharts(dataForApm) {
        if (!currentDbIp) return;

        const src = dataForApm.sourceAgg;

        // Pull data for selected DB IP
        const sla = src.dbSLA[currentDbIp] || [];
        const cpm = src.dbCPM[currentDbIp] || [];
        const avgRes = src.dbAvgRes[currentDbIp] || [];
        const percentile = src.dbAccessPercentile[currentDbIp] || [];

        // Call your existing chart functions
        renderSuccessRateDBChart("dbSlaChart", sla);
        renderTimeSeriesChart({ containerId: "dbCpmChart", data: cpm, chartType: 'spline', yTitle: 'Load (call/min)', unit: ' call/min'});
        renderTimeSeriesChart({ containerId: "dbAvgResChart", data: avgRes, chartType: 'areaspline', yTitle: 'Latency (ms)', unit: ' ms'});
        renderTimeSeriesChart({ containerId: "dbAvgResPercentileChart", data: percentile, chartType: 'areaspline', yTitle: 'Latency Percentile (ms)', unit: ' ms'});
      }

      function renderSuccessRateDBChart(containerId, data) {
        try {
          if (!Array.isArray(data) || data.length === 0 || !data.some(d => Object.keys(d).some(k => k !== 'timeBucket' && d[k] != null))) {
            document.getElementById(containerId).innerHTML ='<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
            return;
          }

          const keys = Array.from(
            new Set(data.flatMap(item => Object.keys(item).filter(k => k !== 'timeBucket')))
          );

          var series = [];

          keys.forEach(function (key) {
            series.push({
              type: 'column',
              name: 'Failure',
              stack: key,
              color: '#DC4245',
              showInLegend: false,
              data: data.map(function (d) {
                return {
                  x: parseTimeBucket(d.timeBucket),
                  y: d[key] != null ? 100 - Number(d[key]) : null
                };
              })
            });
            series.push({
              type: 'column',
              name: 'Success',
              stack: key,
              color: '#549958',
              data: data.map(function (d) {
                return {
                  x: parseTimeBucket(d.timeBucket),
                  y: d[key] != null ? Number(d[key]) : null
                };
              })
            });
          });
          Highcharts.chart(containerId, {
            chart: { type: 'column', backgroundColor: 'transparent', height: '50%' },
            title: { text: null },
            xAxis: {
              type: 'datetime',
              crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
              labels: {
                style: {
                  fontSize: '9px'
                }
              }
            },
            yAxis: {
              min: 0,
              max: 100,
              tickAmount: 6,
              title: { text: 'Success Rate (%)' },
              labels: {
                style: {
                  fontSize: '9px'
                }
              }
            },
            tooltip: { shared: true, xDateFormat: '%Y-%m-%d %H:%M', valueSuffix: ' %' },
            legend: { enabled: false},
            series: series,
            credits: { enabled: false },
            exporting: { enabled: false },
            plotOptions: {
              column: {
                stacking: 'normal',
                maxPointWidth: 10,
                grouping: true,
                borderWidth: 0
              }
            }
          });
        } catch (e) {
          console.error("Error rendering chart:", e);
          document.getElementById(containerId).innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-red-500 p-6">Error rendering chart</p></div>';
        }
      }

      function renderRcaTable(dataForApm) {
        const section = document.getElementById("rcaSection");
        const tbody = document.getElementById("rcaTableBody");

        if (!section || !tbody) return;

        const rcaList = dataForApm?.rcaProblems;

        if (!Array.isArray(rcaList) || rcaList.length === 0) {
          section.classList.add("hidden");
          tbody.innerHTML = "";
          return;
        }

        section.classList.remove("hidden");
        tbody.innerHTML = "";

        rcaList.forEach(function (item) {
          const row = document.createElement("tr");
          row.className = "hover:bg-gray-50";

          let statusClass = "";
          if (item.status === "Critical") {
            statusClass = "status-critical";
          } else if (item.status === "Warning") {
            statusClass = "status-warning";
          }

          const startTime = item.startTime
            ? new Date(item.startTime).toLocaleString()
            : "--";

          const endTime = item.endTime
            ? new Date(item.endTime).toLocaleString()
            : "--";

          row.innerHTML =
            '<td class="px-3 py-2 border">' + (item.alertName || "--") + "</td>" +
            '<td class="px-3 py-2 border">' + (item.metricName || "--") + "</td>" +
            '<td class="px-3 py-2 border ' + statusClass + '">' + (item.status || "--") + "</td>" +
            '<td class="px-3 py-2 border">' + (item.problemStatus || "--") + "</td>" +
            '<td class="px-3 py-2 border">' + (item.thresholdWarningValue ?? "--") + "</td>" +
            '<td class="px-3 py-2 border">' + (item.thresholdCriticalValue ?? "--") + "</td>" +
            '<td class="px-3 py-2 border">' + startTime + "</td>" +
            '<td class="px-3 py-2 border">' + endTime + "</td>" +
            '<td class="px-3 py-2 border">' + (item.triggerCount ?? "--") + "</td>";

          tbody.appendChild(row);
        });
      }


function renderTopology(topology) {

  if (!topology) {
    document.getElementById("topologyContainer").innerHTML =
      '<p class="text-center text-gray-500">No Topology Data</p>';
    return;
  }

  const links = [];
  const nodes = [];
  const hostId = topology.hostIp;
  const gray = '#f3f4f6';

  function formatVal(val) {
    return (val === "NaN" || val === undefined || val === null) ? '0' : val;
  }

  // HOST
  nodes.push({
    id: hostId,
    name:
      '<div class="compact-node">' +
        '<div class="node-title"><i class="fa-solid fa-computer"></i> Host</div>' +
        '<div class="node-kpi-row">' + topology.hostIp + '</div>' +
      '</div>',
    custom: {
      title: 'Host Information',
      details: [
        { label: 'IP', value: topology.hostIp },
        { label: 'CPU Usage', value: topology.hostKpi.cpu_usage },
        { label: 'Memory', value: topology.hostKpi.memory_usage },
        { label: 'Swap', value: topology.hostKpi.swap_usage },
        { label: 'Uptime', value: topology.hostKpi.uptime }
      ]
    },
    color: gray,
    column: 0
  });

  // ROOT DB
  (topology.database || []).forEach(function (db) {
    links.push([hostId, db]);

    nodes.push({
      id: db,
      name:
        '<div class="compact-node">' +
          '<div class="node-title"><i class="fa-solid fa-database"></i> Database</div>' +
          '<div class="node-kpi-row">' + db + '</div>' +
        '</div>',
      custom: {
        title: 'Database',
        details: [{ label: 'Name', value: db }]
      },
      color: gray,
      column: 1
    });
  });

  // GROUP
  const groupName = Object.keys(topology.service || {})[0];
  if (!groupName) return;

  links.push([hostId, groupName]);

  nodes.push({
    id: groupName,
    name:
      '<div class="compact-node">' +
        '<div class="node-title"><i class="fa-solid fa-group-arrows-rotate"></i> Group</div>' +
        '<div class="node-kpi-row">' + groupName + '</div>' +
      '</div>',
    custom: {
      title: 'Service Group',
      details: [{ label: 'Group', value: groupName }]
    },
    color: gray,
    column: 1
  });

  // SERVICES
  const services = topology.service[groupName];

  Object.keys(services).forEach(function (serviceName) {

    const s = services[serviceName];
    links.push([groupName, serviceName]);

    nodes.push({
      id: serviceName,
      name:
        '<div class="compact-node">' +
          '<div class="node-title"><i class="fa-solid fa-gear"></i> ' + serviceName.replace(/_/g, ' ') + '</div>' +
          '<div class="node-kpi-row">' +
            'Load: ' + formatVal(s.kpi.serviceLoad) + ' | ' +
            'Success: ' + formatVal(s.kpi.successRate) + '%' +
          '</div>' +
        '</div>',
      custom: {
        title: serviceName.replace(/_/g, ' '),
        details: [
          { label: 'Service Load', value: formatVal(s.kpi.serviceLoad) },
          { label: 'Success Rate', value: formatVal(s.kpi.successRate) + '%' },
          { label: 'Response Time', value: formatVal(s.kpi.responseTime) + 'ms' },
          { label: 'Apdex', value: formatVal(s.kpi.serviceApdex) },
          { label: 'Total Hits', value: s.kpi.allHits },
          { label: 'Errors', value: s.kpi.errorHits }
        ]
      },
      color: gray,
      column: 2
    });

    // DB INSTANCES
    Object.keys(s.database || {}).forEach(function (dbIp) {

      const dbInfo = s.database[dbIp];
      const dbNodeId = serviceName + '-' + dbIp;

      links.push([serviceName, dbNodeId]);

      nodes.push({
        id: dbNodeId,
        name:
          '<div class="compact-node">' +
            '<div class="node-title"><i class="fa-solid fa-database"></i> ' + dbIp + '</div>' +
            '<div class="node-kpi-row">' +
              'CPM: ' + formatVal(dbInfo.databaseCpm) + ' | ' +
              'Response: ' + formatVal(dbInfo.databaseRes) + 'ms' +
            '</div>' +
          '</div>',
        custom: {
          title: 'Database Instance',
          details: [
            { label: 'IP Address', value: dbIp },
            { label: 'CPM', value: formatVal(dbInfo.databaseCpm) },
            { label: 'Response', value: formatVal(dbInfo.databaseRes) + 'ms' },
            { label: 'SLA', value: formatVal(dbInfo.databaseSla) + '%' },
            { label: 'Usage %', value: formatVal(dbInfo.databasePerc) }
          ]
        },
        color: gray,
        column: 3
      });
    });

  });

  Highcharts.chart('topologyContainer', {

    chart: {
      height: 550,
      backgroundColor: 'transparent'
    },

    title: { text: null },

    tooltip: {
      useHTML: true,
      backgroundColor: 'transparent',
      borderWidth: 0,
      shadow: false,
      formatter: function () {

        const c = this.point.custom;
        if (!c) return false;

        let html = '<div style="background:#fff;padding:10px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.12);font-size:11px;">';

        html += '<div style="font-weight:600;margin-bottom:6px;">' + c.title + '</div>';

        c.details.forEach(function (item) {
          html +=
            '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
              '<span>' + item.label + '</span>' +
              '<span style="font-weight:600;">' + item.value + '</span>' +
            '</div>';
        });

        html += '</div>';
        return html;
      }
    },

    plotOptions: {
      organization: {
        nodePadding: 10,
        borderRadius: 4,
        borderColor: '#cbd5e1',
        dataLabels: {
          useHTML: true,
          style: {
            fontSize: '10px',
            textOutline: 'none'
          }
        }
      }
    },

    series: [{
      type: 'organization',
      keys: ['from', 'to'],
      data: links,
      nodes: nodes,
      nodeWidth: 150,
      nodeHeight: 70,

      point: {
        events: {
          mouseOver: function () {
            const nodeId = this.id;
            this.series.chart.series[0].points.forEach(function (p) {
              if (p.from && p.to && p.graphic) {
                p.graphic.attr({
                  stroke: (p.from === nodeId || p.to === nodeId) ? '#2563eb' : '#cbd5e1',
                  'stroke-width': (p.from === nodeId || p.to === nodeId) ? 2 : 1
                });
              }
            });
          },
          mouseOut: function () {
            this.series.chart.series[0].points.forEach(function (p) {
              if (p.from && p.to && p.graphic) {
                p.graphic.attr({ stroke: '#cbd5e1', 'stroke-width': 1 });
              }
            });
          }
        }
      }
    }],

    credits: { enabled: false }
  });
}


      // --- EVENT LISTENERS ---

      document.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', () => {
          const section = header.closest('.collapsible-section');
          section.classList.toggle('is-expanded');

          if (section.classList.contains('is-expanded')) {
            const dataForApm = reportPayload.dataByApm[currentApp];

            renderChartsForSection(section, dataForApm);

            // If this is DB section → render DB charts
            if (section.querySelector('#dbIpSelect')) {
              renderDbCharts(dataForApm);
            }
          }
        });
      });

    });
  </script>
</body>

</html>
`;
  }
}
