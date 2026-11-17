import {
  Component, ElementRef, HostListener, ViewChild,
  OnInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ControlZoneManagmentService } from '../../services/control-zone-managment-service';
import { AuthenticationService } from '../../services/authentication.service';
import { User } from '../../models/user';
import { ControlGroup } from '../../models/ControlZone';

@Component({
  selector: 'app-control-zone-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './control-zone-managment.component.html',
  styleUrl: './control-zone-managment.component.css'
})
export class ControlZoneManagementComponent implements OnInit, OnDestroy {

  @ViewChild('dropdownWrapper') dropdownWrapper!: ElementRef;

  controlZones: ControlGroup[] = [];
  filteredControlZones: ControlGroup[] = [];
  selectedZone: ControlGroup | null = null;
  selectedZoneLabel: string = 'Control Zones';
  dropdownOpen: boolean = false;
  isLoading: boolean = false;
  error: string = '';
  hideControlZone: boolean = false;

  private currentUser: User | null = null;
  private userSub!: Subscription;
  private routerSub!: Subscription;

  constructor(
    private controlZoneManagmentService: ControlZoneManagmentService,
    private authService: AuthenticationService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.checkRouteData();
    });
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkRouteData();
    });
  }

  checkRouteData(): void {
    let route: ActivatedRoute | null = this.activatedRoute;
    let hide = false;

    while (route) {
      if (route.snapshot.data &&
          route.snapshot.data['hideControlZone'] === true) {
        hide = true;
        break;
      }
      route = route.firstChild;
    }

    this.hideControlZone = hide;

    this.controlZoneManagmentService.setControlZoneEnabled(!hide);

    if (hide) {
      this.selectedZone = null;
      this.selectedZoneLabel = 'Control Zones';
    } else if (this.currentUser) {
        this.loadControlZones();
      }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  loadControlZones(): void {
    if (!this.currentUser) return;
    this.isLoading = true;
    this.error = '';

    this.controlZoneManagmentService.getAllControlZones(this.currentUser).subscribe({
      next: (response: any) => {
        if (response?.serviceStatus === 'Success' && response?.serviceResponse) {
          this.controlZones = response.serviceResponse;
          this.filteredControlZones = [...this.controlZones];
          const storedId = sessionStorage.getItem('controlZoneId');
          const storedName = sessionStorage.getItem('controlZoneName');

          if (this.selectedZone) {
            const stillExists = this.controlZones.find(z => z.id === this.selectedZone!.id);
            if (stillExists) {
              this.selectedZone = stillExists;
              this.selectedZoneLabel = stillExists.groupName;
            } else {
              this.selectedZone = null;
              this.selectedZoneLabel = 'All Zones';
              this.controlZoneManagmentService.setSelectedZone(null);
            }
          } else if (storedId) {
            const restoredZone = this.controlZones.find(z => z.id === Number(storedId));
            if (restoredZone) {
              this.selectedZone = restoredZone;
              this.selectedZoneLabel = restoredZone.groupName;
            }
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading control zones:', err);
        this.error = 'Failed to load control zones';
        this.isLoading = false;
      }
    });
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  onZoneSelect(zone: ControlGroup): void {
    this.selectedZone = zone;
    this.selectedZoneLabel = zone.groupName;
    this.dropdownOpen = false;
    this.controlZoneManagmentService.setSelectedZone(zone);
  }

  onSelectAll(): void {
    this.selectedZone = null;
    this.selectedZoneLabel = 'All Zones';
    this.dropdownOpen = false;
    this.controlZoneManagmentService.setSelectedZone(null);
  }

  searchZones(query: string): void {
    const q = query.trim().toLowerCase();
    this.filteredControlZones = q
      ? this.controlZones.filter(zone => zone.groupName.toLowerCase().includes(q))
      : [...this.controlZones];
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (this.dropdownWrapper && !this.dropdownWrapper.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }
}