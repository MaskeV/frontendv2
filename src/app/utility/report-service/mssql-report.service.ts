import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MssqlReportService {

  constructor() { }

  public getMssqlHtmlTemplate(): string {
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
      
    /* ---------- KPI ---------- */
      
    .kpi-card {
      background: #f9fafb;
      border-radius: 10px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      padding: 7px 0;
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
      font-size: small;
      border-bottom: 1px solid black;
      font-family: 'Inter', 'Roboto', 'Segoe UI', sans-serif;
    }
      
    /* ---------- Charts ---------- */
      
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 6px;
      font-size: small;
      border-bottom: 1px solid black;
      font-family: 'Inter', 'Roboto', 'Segoe UI', sans-serif;
    }
      
    .chart-title {
      font-weight: 500;
      letter-spacing: 0.7px;
      background-color: #66A3AD85;
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
      
    /* ---------- Collapsible Sections ---------- */
      
    .collapsible-header {
      cursor: pointer;
      padding: 1rem;
      background-color: #fff;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
      
    .collapsible-content {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.5s ease-in-out;
    }
      
    .collapsible-content > div {
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
      
    /* ---------- Scrollbar ---------- */
      
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
      
    ::-webkit-scrollbar-track {
      background-color: #e5e7eb;
    }
      
    ::-webkit-scrollbar-thumb {
      background-color: #6d8e94;
      border-radius: 3px;
    }
      

  </style>
</head>

<body class="bg-gray-100">
  <div class="max-w-7xl mx-auto p-2 sm:p-6">

    <header class="bg-white shadow-md rounded-xl p-2 mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center">
        <img src="${absoluteImagePath}" alt="APM Icon" class="h-12 w-12 mr-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-800">DB Performance</h1>
          <p class="text-gray-600 text-sm mt-1 font-semibold" id="header-app-name">DB: --</p>
        </div>
      </div>

      <div class="flex flex-col text-right">
        <span class="text-sm text-gray-500">Generated: <span id="header-generated-at">--</span></span>
        <span class="text-sm text-gray-500">Start: <span id="header-start-time">--</span></span>
        <span class="text-sm text-gray-500">End: <span id="header-end-time">--</span></span>
      </div>
    </header>


    <section class="mb-2">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

        <div class="kpi-card avgQps">
          <div class="flex justify-center">
            <div class="kpi-label">QPS</div>
          </div>
          <div class="kpi-value" id="kpi-avgQps">--</div>
        </div>
        
        <div class="kpi-card avgConnection">
          <div class="flex justify-center">
            <div class="kpi-label">Connections</div>
          </div>
          <div class="kpi-value" id="kpi-avgConnection">--</div>
        </div>
      </div>
    </section>

    <section class="collapsible-section bg-white shadow-md rounded-xl p-2 mb-2">
      <div class="collapsible-header">
        <h2 class="header-title text-xl font-semibold text-gray-700">Query Volume</h2>
        <div class="header-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg></div>
      </div>
      <div class="collapsible-content">
        <div>
          <div class="flex gap-4 pt-6">
            <div class="hidden md:flex items-center justify-center">
              <div class="chart-group-label">Query Volume</div>
            </div>
            <div class="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="card w-33">
                <div class="card-header chart-title">
                  <span>QPS</span>
                </div>
                <div id="QpsData" class="bg-white border border-gray-200 chart-card"
                  data-chart-type="QpsData"></div>
              </div>
              <div class="card w-33">
                <div class="card-header chart-title">
                  <span>Slow Queries Trend</span>
                </div>
                <div id="slowQueryRateData" class="bg-white border border-gray-200 chart-card"
                  data-chart-type="slowQueryRateData"></div>
              </div>
              <div class="card w-33">
                <div class="card-header chart-title">
                  <span>Read Query Trend</span>
                </div>
                <div id="readQueryData" class="bg-white border border-gray-200 chart-card"
                  data-chart-type="readQueryData"></div>
              </div>
              <div class="card w-33">
                <div class="card-header chart-title">
                  <span>Write Query Trend</span>
                </div>
                <div id="writeQueryData" class="bg-white border border-gray-200 chart-card"
                  data-chart-type="writeQueryData"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="collapsible-section bg-white shadow-md rounded-xl p-2 mb-2">
      <div class="collapsible-header">
        <h2 class="header-title text-xl font-semibold text-gray-700">Connections</h2>
        <div class="header-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg></div>
      </div>
      <div class="collapsible-content">
        <div>
          <div class="flex gap-4 pt-6">
            <div class="hidden md:flex items-center justify-center">
              <div class="chart-group-label">Query Volume</div>
            </div>
            <div class="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="card w-33">
                <div class="card-header chart-title">
                  <span>Threads</span>
                </div>
                <div id="threadTrendData" class="bg-white border border-gray-200 chart-card"
                  data-chart-type="threadTrendData"></div>
              </div>

              <div class="card w-33">
                <div class="card-header chart-title">
                  <span>Connection Error</span>
                </div>
                <div id="connectionErrorData" class="bg-white border border-gray-200 chart-card"
                  data-chart-type="connectionErrorData"></div>
              </div>

              <div class="card w-33">
                <div class="card-header chart-title">
                  <span>Connects</span>
                </div>
                <div id="connectsTrendData" class="bg-white border border-gray-200 chart-card"
                  data-chart-type="connectsTrendData"></div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>

  <script>
    // Data will be injected here
    %%REPORT_PAYLOAD_SCRIPT_BLOCK%%

    // Global state variables
    let currentApp = '';

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

  function renderHeaderInfo(appName, dataForDb) {
    document.getElementById("header-app-name").innerText = "Application: " + appName;
    document.getElementById("header-generated-at").innerText = new Date().toLocaleString();
    // If you passed st & et in payload
    if (dataForDb?.meta) {
      if (dataForDb.meta.startTime)
        document.getElementById("header-start-time").innerText = formatTimeBucketToReadable(dataForDb.meta.startTime);
    
      if (dataForDb.meta.endTime)
        document.getElementById("header-end-time").innerText = formatTimeBucketToReadable(dataForDb.meta.endTime);
    }
  }

  function renderKpis(dataForDb) {
    if (!dataForDb || !dataForDb.kpis) return;
    const kpis = dataForDb.kpis;

    const avgQpsEl = document.getElementById('kpi-avgQps');
      if (avgQpsEl && kpis.avgQps != null)
        avgQpsEl.innerText = Number(kpis.avgQps).toFixed(2);
    
    const avgConnectionEl = document.getElementById('kpi-avgConnection');
      if (avgConnectionEl && kpis.avgConnection != null)
        avgConnectionEl.innerText = Number(kpis.avgConnection).toFixed(2);
  }


  function renderTimeSeriesChart(containerId, data, options = {}) {
    try {
      const {
        chartType = 'areaspline',
        yAxisTitle = '',
        valueSuffix = '',
        legendEnabled = false
      } = options;

      if (
        !Array.isArray(data) ||
        data.length === 0 ||
        !data.some(d =>
          Object.keys(d).some(k => k !== 'timeBucket' && d[k] != null)
        )
      ) {
        document.getElementById(containerId).innerHTML =
          '<div class="flex items-center justify-center h-full">' +
          '<p class="text-center text-gray-500 p-6">No Data Available</p>' +
          '</div>';
        return;
      }

      const keys = Array.from(
        new Set(data.flatMap(item => Object.keys(item).filter(k => k !== 'timeBucket')))
      );

      const series = keys.map(key => ({
        name: key,
        data: data.map(d => ({
          x: parseTimeBucket(d.timeBucket),
          y: d[key] != null ? Number(d[key]) : null
        })),
        type: chartType,
        marker: { radius: 2 },
        lineWidth: 2
      }));

      Highcharts.chart(containerId, {
        chart: {
          type: chartType,
          backgroundColor: 'transparent',
          height: '50%'
        },
        title: { text: null },
        xAxis: {
          type: 'datetime',
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'ShortDot'
          },
          labels: { style: { fontSize: '9px' } }
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: yAxisTitle },
          labels: { style: { fontSize: '9px' } }
        },
        tooltip: {
          shared: true,
          xDateFormat: '%Y-%m-%d %H:%M',
          valueSuffix: valueSuffix
        },
        legend: { enabled: legendEnabled },
        series: series,
        credits: { enabled: false },
        exporting: { enabled: false },
        plotOptions: {
          areaspline: { fillOpacity: 0.3 },
          spline: { marker: { enabled: true } },
          line: { marker: { enabled: true } },
          column: { borderWidth: 0 }
        }
      });
    } catch (e) {
      console.error('Error rendering chart:', e);
      document.getElementById(containerId).innerHTML =
        '<div class="flex items-center justify-center h-full">' +
        '<p class="text-center text-red-500 p-6">Error rendering chart</p>' +
        '</div>';
    }
  }

  const chartRenderers = {
    QpsData: (id, data) =>
      renderTimeSeriesChart(id, data, {
        chartType: 'areaspline',
        yAxisTitle: 'QPS',
        valueSuffix: ''
      }),
    slowQueryRateData: (id, data) =>
      renderTimeSeriesChart(id, data, {
        chartType: 'spline',
        yAxisTitle: '',
        valueSuffix: ' ms'
      }),
    readQueryData: (id, data) =>
      renderTimeSeriesChart(id, data, {
        chartType: 'areaspline',
        yAxisTitle: '',
        valueSuffix: ' '
      }),
    writeQueryData: (id, data) =>
      renderTimeSeriesChart(id, data, {
        chartType: 'spline',
        yAxisTitle: '',
        valueSuffix: ' '
      }),
    threadTrendData: (id, data) =>
      renderTimeSeriesChart(id, data, {
        chartType: 'spline',
        yAxisTitle: '',
        valueSuffix: ' '
      }),
    connectionErrorData: (id, data) =>
      renderTimeSeriesChart(id, data, {
        chartType: 'spline',
        yAxisTitle: '',
        valueSuffix: ' '
      }),
    connectsTrendData: (id, data) =>
      renderTimeSeriesChart(id, data, {
        chartType: 'spline',
        yAxisTitle: '',
        valueSuffix: ' '
      })
  };

  document.addEventListener('DOMContentLoaded', () => {
    const apps = Object.keys(reportPayload.dataByDb);
    if (apps.length > 0) {
      currentApp = apps[0];
      renderReportForDb(currentApp);
    }
    function renderReportForDb(ip) {
      currentApp = ip;
      const dataForDb = reportPayload.dataByDb[ip];
      renderHeaderInfo(ip, dataForDb);
      renderKpis(dataForDb);
      document.querySelectorAll('.collapsible-section.is-expanded').forEach(section => {
        renderChartsForSection(section, dataForDb);
      });
      document.querySelectorAll('.collapsible-section:not(.is-expanded)').forEach(section => {
        section.querySelectorAll('.chart-card').forEach(c => c.innerHTML = '');
      });
    }
    function renderChartsForSection(section, dataForDb) {
      if (!dataForDb) return;
      section.querySelectorAll('.chart-card').forEach(chartContainer => {
        const chartType = chartContainer.dataset.chartType;
        const chartData = dataForDb[chartType];
        const renderer = chartRenderers[chartType];
        if (!renderer || !Array.isArray(chartData)) {
          chartContainer.innerHTML =
            '<div class="flex items-center justify-center h-full"><p class="text-center text-gray-500 p-6">No Data Available</p></div>';
          return;
        }
        renderer(chartContainer.id, chartData);
      });
    }
    // --- EVENT LISTENERS ---
    document.querySelectorAll('.collapsible-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.closest('.collapsible-section');
        section.classList.toggle('is-expanded');
        if (section.classList.contains('is-expanded')) {
          const dataForDb = reportPayload.dataByDb[currentApp];
          renderChartsForSection(section, dataForDb);
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

