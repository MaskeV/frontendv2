import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ReportGeneratorService {

  constructor() { }

  public getInfraHtmlTemplate(reportData: any): string {
    if (!reportData || !reportData.dataByIp) {
      return `<p>No data available</p>`;
    }

    let html = `
    <div class="infra-report">
      <h2>Infrastructure Report</h2>
  `;

    for (const ip of reportData.ips) {
      const ipData = reportData.dataByIp[ip];

      html += `
      <hr />
      <h3>IP Address: ${ip}</h3>

      <p>
        <strong>Start Time:</strong> ${ipData.startTime} <br />
        <strong>End Time:</strong> ${ipData.endTime}
      </p>

      <h4>KPI Data</h4>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Load Average</td>
          <td>${ipData.kpiData.load_average ?? 'N/A'}</td>
        </tr>
        <tr>
          <td>CPU Usage</td>
          <td>${ipData.kpiData.cpu_usage ?? 'N/A'}</td>
        </tr>
        <tr>
          <td>Memory Usage</td>
          <td>${ipData.kpiData.memory_usage ?? 'N/A'}</td>
        </tr>
        <tr>
          <td>Swap Usage</td>
          <td>${ipData.kpiData.swap_usage ?? 'N/A'}</td>
        </tr>
        <tr>
          <td>Uptime</td>
          <td>${ipData.kpiData.uptime ?? 'N/A'}</td>
        </tr>
      </table>

      <h4>Network Bandwidth Time Buckets</h4>
      ${this.renderTimeBucketTable(ipData.networkBandwidthData)}

      <h4>Memory RAM Time Buckets</h4>
      ${this.renderTimeBucketTable(ipData.memoryRamData)}
    `;
    }

    html += `</div>`;
    return html;
  }

  private renderTimeBucketTable(data: any[]): string {
    if (!data || data.length === 0) {
      return `<p>No data available</p>`;
    }

    let rows = data
      .map(d => `<tr><td>${d.time_bucket}</td></tr>`)
      .join('');

    return `
    <table border="1" cellpadding="6" cellspacing="0">
      <tr>
        <th>Time Bucket</th>
      </tr>
      ${rows}
    </table>
  `;
  }


}
