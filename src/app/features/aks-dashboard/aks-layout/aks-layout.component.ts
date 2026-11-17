import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet
} from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-aks-layout',
    imports: [RouterOutlet, CommonModule, FormsModule],
    templateUrl: './aks-layout.component.html',
    styleUrl: './aks-layout.component.css'
})
export class AksLayoutComponent implements OnInit {

  activeDashboardName: string | null = null;
  hostName!: string;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.hostName = sessionStorage.getItem('selectedNode')!;
    // 🔹 Initial load / refresh case
    this.updateActiveDashboard();

    // 🔹 Route change case
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateActiveDashboard();
      });
  }

private updateActiveDashboard(): void {
  const child = this.route.firstChild;
  const path = child?.snapshot.routeConfig?.path ?? null;
  
  // empty string ya null dono ko null treat karo
  this.activeDashboardName = path ? path : null;
}

  goToDashboards(): void {
    this.router.navigate([`/aks/${this.hostName}`]);
  }

  goToAksDashboard(): void {
    this.router.navigate(['/aks']);
  }
}
