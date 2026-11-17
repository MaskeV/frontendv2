import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-kubernetes-tab-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="k8s-tab-header-wrap">
      <!-- Breadcrumb -->
      <nav aria-label="breadcrumb">
        <div class="k8s-breadcrumb">
          <a (click)="goToKubernetes()">Kubernetes</a>
          <span class="separator">></span>
          <a class="cluster-crumb clickable" *ngIf="selectedCluster && activeTab !== 'cluster'" (click)="goToCluster()">{{ selectedCluster }}</a>
          <span class="cluster-crumb" *ngIf="selectedCluster && activeTab === 'cluster'">{{ selectedCluster }}</span>
          <span class="separator" *ngIf="selectedCluster">></span>
          <span class="active-crumb">{{ activeTabLabel }}</span>
        </div>
      </nav>

      <!-- Tabs Navigation Card -->
      <div class="k8s-tabs-card">
        <ul class="nav nav-tabs k8s-nav-tabs">
          <li class="nav-item">
            <a class="nav-link" [class.active]="activeTab === 'cluster'" (click)="selectTab('cluster')">
              Cluster Overview
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" [class.active]="activeTab === 'namespace'" (click)="selectTab('namespace')">
              Namespaces
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" [class.active]="activeTab === 'workload'" (click)="selectTab('workload')">
              Workloads
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" [class.active]="activeTab === 'node'" (click)="selectTab('node')">
              Nodes
            </a>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    button, a {
      font-family: inherit;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    .k8s-tab-header-wrap {
      width: 100%;
      margin-bottom: 12px;
      box-sizing: border-box;
    }

    .k8s-breadcrumb {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      margin-bottom: 8px;
      padding: 2px 2px;
      line-height: 1.4;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .k8s-breadcrumb a {
      color: #64748b;
      text-decoration: none;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .k8s-breadcrumb a:hover {
      color: #2563eb;
      text-decoration: underline;
    }

    .k8s-breadcrumb .separator {
      color: #94a3b8;
      font-size: 11px;
    }

    .k8s-breadcrumb .cluster-crumb {
      color: #64748b;
      font-weight: 500;
    }

    .k8s-breadcrumb .cluster-crumb.clickable {
      color: #64748b;
      cursor: pointer;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .k8s-breadcrumb .cluster-crumb.clickable:hover {
      color: #2563eb;
      text-decoration: underline;
    }

    .k8s-breadcrumb .active-crumb {
      color: #219ebc;
      font-weight: 700;
    }

    .k8s-tabs-card {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid #e5eaf3;
      padding: 0 12px;
      height: 42px;
      display: flex;
      align-items: center;
      box-sizing: border-box;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .k8s-tabs-card::-webkit-scrollbar {
      display: none;
    }

    .k8s-nav-tabs {
      background-color: transparent !important;
      display: flex !important;
      flex-wrap: nowrap !important;
      min-width: max-content;
      border: 0 !important;
      margin-bottom: 0 !important;
      padding: 0 !important;
      list-style: none !important;
      height: 100% !important;
      align-items: center !important;
    }

    .k8s-nav-tabs .nav-item {
      height: 100% !important;
      display: flex !important;
      align-items: center !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .k8s-nav-tabs .nav-link {
      position: relative !important;
      color: #64748b !important;
      padding: 0 18px !important;
      height: 100% !important;
      border: none !important;
      background: none !important;
      transition: color 0.2s ease;
      text-decoration: none !important;
      cursor: pointer !important;
      font-size: 13.5px !important;
      font-weight: 600 !important;
      display: inline-flex !important;
      align-items: center !important;
      line-height: 1 !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      border-radius: 0 !important;
      white-space: nowrap !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }

    .k8s-nav-tabs .nav-link:hover {
      color: #0f172a !important;
    }

    .k8s-nav-tabs .nav-link::after {
      content: "";
      position: absolute;
      left: 0;
      bottom: 0;
      width: 0%;
      height: 3px;
      background: linear-gradient(to right, #E31C1F, #FF9500, #FFC07F);
      transition: width 0.3s ease;
      z-index: 1;
    }

    .k8s-nav-tabs .nav-link.active {
      color: #0f172a !important;
      font-weight: 700 !important;
    }

    .k8s-nav-tabs .nav-link.active::after {
      width: 100% !important;
    }

    @media (max-width: 640px) {
      .k8s-breadcrumb {
        font-size: 11.5px;
        gap: 6px;
      }
      .k8s-tabs-card {
        height: 38px;
        padding: 0 8px;
      }
      .k8s-nav-tabs .nav-link {
        padding: 0 12px !important;
        font-size: 12.5px !important;
      }
    }
  `]
})
export class KubernetesTabHeaderComponent {
  @Input() activeTab: 'cluster' | 'namespace' | 'workload' | 'node' = 'cluster';
  @Input() selectedCluster: string = 'aks-live';

  constructor(private router: Router) { }

  get activeTabLabel(): string {
    switch (this.activeTab) {
      case 'cluster':
        return 'Cluster Overview';
      case 'namespace':
        return 'Namespaces';
      case 'workload':
        return 'Workloads';
      case 'node':
        return 'Nodes';
      default:
        return 'Overview';
    }
  }

  goToKubernetes(): void {
    this.router.navigate(['/kubernetes']);
  }

  goToCluster(): void {
    this.router.navigate(['/kubernetes-cluster'], {
      queryParams: { cluster: this.selectedCluster || 'aks-live' },
      queryParamsHandling: 'merge'
    });
  }

  selectTab(tab: 'cluster' | 'namespace' | 'workload' | 'node'): void {
    if (tab === this.activeTab) {
      return;
    }

    const routePath = tab === 'cluster' ? '/kubernetes-cluster' : `/kubernetes-${tab}`;
    this.router.navigate([routePath], {
      queryParams: { cluster: this.selectedCluster || 'aks-live' },
      queryParamsHandling: 'merge'
    });
  }
}
