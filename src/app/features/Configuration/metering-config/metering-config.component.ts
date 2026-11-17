import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MeteringConfigService } from '../../../services/metering-config.service';
import { hostConfig } from '../../../models/hostConfig';
import { CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
declare var bootstrap: any;

export interface Host {
  id: number;
  hostname: string;
  platform: string | null;
  hardwareVendor: string;
  hardwareModel: string;
  hardwareVersion: string;
  hardwareSerial: string;
  computerName: string;
  primaryIp: string;
  primaryMac: string;
  lastEnrolledAt: string;
  publicIp: string;
  osVersion: string;
  status?: 'Online' | 'Offline';
}
export interface HostGroupPayload {
  id?: number;
  name: string;
  description: string;
  config?: any; 
  filename?: string | null; 
  isNew?: boolean; 
  hosts?: Host[]; 
  createdAt?: string;
  updatedAt?: string;
}
export interface GroupSummary {
  id: number;
  name: string;
  hostCount: number;
}

export interface TeamStepper {
  id: number;
  name: string;
  description: string;
  zoneId: number;
  config?: any;
  filename?: string | null;
  isNew?: boolean;
  hosts?: Host[];
}
export interface Zone {
  id: number;
  name: string;
  description: string;
  createdAt?: string; 
  updatedAt?: string;
  groups?: TeamStepper[];
}
export interface ZoneDetailsResponse {
  id: number;
  name: string;
  description: string | null;
  groups: GroupSummary[];
}
export interface ZonesDTOPayload {
  id?: number;
  name: string;
  description: string;
  groups: HostGroupPayload[];
  isNew?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export interface FinalAssetData {
  assetId: string; 
  zoneId: number;
  zoneName: string;
  teamId: number;
  teamName: string;
  hostsCount: number;
  associatedHosts: Host[];
}
export interface GroupedAssetsByZone {
  zone: Zone;
  assets: FinalAssetData[];
}
export interface Software {
  name: string;
  version: string;
}
export interface HostGroupDetailsResponse {
  id: number;
  name: string;
  description: string | null;
  config: any | null;
  filename: string | null;
  createdAt: string;
  updatedAt: string;
  hosts: Host[];
  hostCount: number | null; 
}
export interface TeamFieldExpandedState {
  name: boolean;
  description: boolean;
  host: boolean;
  createdOn: boolean;
}


@Component({
    selector: 'app-metering-config',
    imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatMenuModule, DragDropModule],
    templateUrl: './metering-config.component.html',
    styleUrl: './metering-config.component.css'
})
export class MeteringConfigComponent implements OnInit {

  constructor(
    private meteringConfigService: MeteringConfigService,
    private http: HttpClient
  ) { }

  private nextId = 1;
  // Tab management
  activeTab: string = 'client';
  // Teams functionality
  searchTerm = '';
  selectedHostType: string = '';
  selectedHostName: string = '';
  selectedEnv: string = '';
  selectedZone: string = '';
  searchText: string = '';
  hostTypeOptions: string[] = ['LINUX', 'MAC', 'WINDOWS'];
  hostNameOptions: { hostId: number, hostName: string }[][] = [];
  envOptions: string[] = ['UAT', 'PROD', 'DR', 'CUG', 'Other'];
  hostConfigs: hostConfig[] = [
    {
      id: 0, hostDetails: '', hostType: '', environment: '', zone: '', hostId: 0,
      createdOn: undefined,
      updatedOn: undefined
    }
  ];
  aggregatedData: any = null;
  isDataEmpty: boolean = true;
  minRunTime!: number;
  aggregatedDays!: number;
  lastupdation: any;
  zoneList: string[] = [];
  config: { zone: string } = { zone: '' };
  showZoneDropdown = false;
  filteredZones: string[] = [];
  showDropdown = false;
  highlightedZone: string | null = null;
  zoneDropdownStates: boolean[] = [false];
  sortparam: any;
  sortDirection = 'asc';
  page: number = 1;
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  inputPage: number = 1;
  // editingTeam: Team | null = null;
  teamToDeleteId: number | null = null;
  showTeamForm: boolean = false;
  isEditing: boolean = false;
  teamFieldExpandedState: Map<number, TeamFieldExpandedState> = new Map();
  allHostsForModal: Host[] = [];
  createdOnInput: string = '';
  selectedHosts: Host[] = [];
  allAssociatedHosts: { [assetId: string]: Host[] } = {};
  private modalSelectedHostIds: Set<number> = new Set();
  currentStep: number = 1;
  isFormSubmitted: boolean = false; 
  zoneForm: Zone = { id: 0, name: '', description: '' };
  selectedZoneClient: Zone | null = null; 
  teamForm: TeamStepper = { id: 0, name: '', description: '', zoneId: 0 };
  selectedTeam: TeamStepper | null = null;
  softwareForm: Software = { name: '', version: '' };
  selectedHostsClient: Host[] = [];
  allZones: Zone[] = [];
  allTeamsAcrossAllZones: TeamStepper[] = [];
  steps = [
    { number: 1, title: 'Zone Configuration', completed: false, icon: '1', expanded: true },
    { number: 2, title: 'Team Details', completed: false, icon: '2', expanded: false },
    // { number: 3, title: 'Software Available', completed: false, icon: '3', expanded: false },
    { number: 3, title: 'Add Hosts', completed: false, icon: '3', expanded: false }
  ];
  isEditingFromTable: boolean = false;
  editingAssetContext: FinalAssetData | null = null;
  isCreatingNewZone: boolean = true;
  isAddingNewZoneDirectly: boolean = false;
  isAddingNewTeamInEditMode: boolean = false;
  isConfiguringZone: boolean = false;
  configuringZoneContext: Zone | null = null;
  private unassignedTeams: TeamStepper[] = [];
  finalAssetTableData: FinalAssetData[] = [];
  groupedFinalAssetTableData: GroupedAssetsByZone[] = [];
  showHostsModal: boolean = false;
  viewingTeamName: string = '';
  hostsForViewing: Host[] = [];
  toast: { message: string; type: 'success' | 'error'; visible: boolean } = { message: '', type: 'success', visible: false };
  selectedZoneAction: string | null = null;



  ngOnInit(): void {
    this.getClientHostConfigData();
    this.getZoneList();
    // this.filterTeams();
    this.loadAllZonesAndTeams();
  }

  loadAllZonesAndTeams(): void {
    this.meteringConfigService.getAllZones().subscribe({
      next: (zonesDetails: ZoneDetailsResponse[]) => {
        this.allZones = [];
        this.allTeamsAcrossAllZones = [];
        this.finalAssetTableData = [];
        this.allAssociatedHosts = {};
        this.unassignedTeams = [];

        zonesDetails.forEach(zoneDto => {
          if (zoneDto.id === -1) {
            // Handle unassigned groups
            zoneDto.groups.forEach(groupSummary => {
              const team: TeamStepper = {
                id: groupSummary.id,
                name: groupSummary.name,
                description: '',
                zoneId: -1,
              };
              this.unassignedTeams.push(team);
            });
          } else {
            this.allZones.push({
              id: zoneDto.id,
              name: zoneDto.name,
              description: zoneDto.description || '',
              groups: zoneDto.groups.map(groupSummary => ({
                id: groupSummary.id,
                name: groupSummary.name,
                description: '', // Will be populated if needed
                zoneId: zoneDto.id
              }))
            });

            console.log("Zone Data", JSON.stringify(this.allZones, null, 2));

            const currentZoneGroups = zoneDto.groups || [];
            currentZoneGroups.forEach(groupSummary => {
              const team: TeamStepper = {
                id: groupSummary.id,
                name: groupSummary.name,
                description: '',
                zoneId: zoneDto.id,
              };
              this.allTeamsAcrossAllZones.push(team);

              const assetId = `AST-Z${zoneDto.id}-T${groupSummary.id}-${this.generateFrontendTempId()}`;
              const asset: FinalAssetData = {
                assetId: assetId,
                zoneId: zoneDto.id,
                zoneName: zoneDto.name,
                teamId: groupSummary.id,
                teamName: groupSummary.name,
                hostsCount: groupSummary.hostCount || 0,
                associatedHosts: []
              };
              this.finalAssetTableData.push(asset);
            });
          }
        });

        if (this.allZones.length > 0) {
          this.isFormSubmitted = true;
          this.processFinalAssetTableData(zonesDetails.filter(z => z.id !== -1));
        } else {
          this.isFormSubmitted = false;
          this.resetStepperState();
        }
      },
      error: (err) => {
        console.error('Error loading zones and teams:', err);
        this.isFormSubmitted = false;
        this.resetStepperState();
      }
    });
  }

  handleZoneAction(event: Event, zone: Zone): void {
    const selectedValue = (event.target as HTMLSelectElement).value;

    if (selectedValue === 'config') {
      this.configZone(zone);
    } else if (selectedValue === 'delete') {
      this.deleteZone(zone.id);
    }
    setTimeout(() => {
      this.selectedZoneAction = null;
    }, 100);
  }

  showToast(message: string, backgroundColor: string = '#333333', textColor: string = 'white'): void {
    const toastEl = document.getElementById('customToast');
    const toastBodyEl = document.getElementById('toastBody');

    if (toastEl && toastBodyEl) {
      toastBodyEl.textContent = message;

      toastEl.className = 'toast align-items-center text-white border-0';

      toastEl.setAttribute(
        'style',
        `background-color: ${backgroundColor}; color: ${textColor};`
      );

      toastBodyEl.setAttribute('style', `color: ${textColor};`);

      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    }
  }



  getClientHostConfigData() {
    this.meteringConfigService.getClientHostConfig().subscribe(
      (response) => {
        if (
          response?.serviceStatus?.toLowerCase() === 'success' &&
          response?.serviceResponse &&
          typeof response.serviceResponse.aggregatedDays === 'number'
        ) {
          this.aggregatedData = response.serviceResponse;
          this.aggregatedDays = this.aggregatedData.aggregatedDays;
          this.minRunTime = this.aggregatedData.minRunTime;
          this.lastupdation = this.aggregatedData.updatedOn;
          this.isDataEmpty = false;
        } else {
          this.aggregatedData = null;
          this.lastupdation = null;
          this.isDataEmpty = true;
        }
      },
      (error) => {
        this.aggregatedData = null;
        this.lastupdation = null;
        this.isDataEmpty = true;
      }
    );
  }

  addRow() {
    const newConfig: hostConfig = {
      id: this.nextId++,
      hostDetails: '',
      hostType: '',
      environment: '',
      zone: '',
      hostId: Math.floor(Math.random() * 10000) + 1,
      createdOn: undefined,
      updatedOn: undefined
    };
    this.hostConfigs.push(newConfig);
    this.hostNameOptions.push([]);
    this.zoneDropdownStates.push(false);
  }
  deleteRow(index: number) {
    this.hostConfigs.splice(index, 1);
    this.zoneDropdownStates.splice(index, 1);
  }

  getDefaultHostConfig(): hostConfig {
    return {
      id: 0,
      hostDetails: '',
      hostType: '',
      environment: '',
      zone: '',
      hostId: 0,
      createdOn: undefined,
      updatedOn: undefined
    };
  }

  // hpstMetadataCreation
  createHostConfig(): void {
    if (this.hostConfigs.length === 0) {
      this.showToast("Please add at least one host configuration.", "#ffd166", "#000000");
      return;
    }
    for (let i = 0; i < this.hostConfigs.length; i++) {
      const cfg = this.hostConfigs[i];
      if (!cfg.hostType || !cfg.hostDetails || !cfg.environment || !cfg.zone) {
        this.showToast(`Row ${i + 1}: Please select Host Type, Host Name, Environment and Zone.`, "#f9c74f", "#000000");
        return;
      }
    }
    const enrichedConfigs = this.hostConfigs.map((config, index) => ({
      ...config,
      id: config.id || index + 1,
      hostId: config.hostId || (1000 + index),
    }));
    this.meteringConfigService.createHostMetadataList(enrichedConfigs).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus.toLowerCase() === 'success') {
          this.showToast(res.serviceResponse || 'Host metadata saved!', "#c1ff9b", "#000000");
          this.hostConfigs = [this.getDefaultHostConfig()];
        } else {
          this.showToast(res.serviceResponse || 'Failed to save host metadata.', "#ff6161", "#000000");
        }
      },
      error: (err: any) => {
        const errorMessage =
          err?.error?.serviceResponse ||
          err?.error?.message ||
          err.message ||
          'Unexpected error occurred while saving host metadata.';
        this.showToast(errorMessage, "#ff6161", "#000000");
      },
    });
  }

  onHostTypeChange(type: string, index: number) {
    this.hostNameOptions[index] = [];
    if (type) {
      this.meteringConfigService.getHostNameList(type).subscribe({
        next: (res) => {
          const list = res?.serviceResponse || [];
          if (list.length === 0) {
            this.showToast(`No list of host name exists for the selected host type: ${type}`, "#f9c74f", "#000000")

          }
          this.hostNameOptions[index] = list;
        },
        error: (err) => {
          this.hostNameOptions[index] = [];
        }
      });
    }
  }

  onHostNameChange(selectedHostName: string, index: number): void {
    const selectedHost = this.hostNameOptions[index].find(host => host.hostName === selectedHostName);
    if (selectedHost) {
      this.hostConfigs[index].hostDetails = selectedHost.hostName;
      this.hostConfigs[index].hostId = selectedHost.hostId;
    }
  }


  createClientHostConfig() {
    if (!this.aggregatedDays || isNaN(this.aggregatedDays)) {
      alert("Please enter a valid aggregated days value.");
      return;
    }
    const payload = {
      clientName: "netraa",
      aggregatedDays: this.aggregatedDays,
      minRunTime: this.minRunTime
    };
    this.meteringConfigService.createClientHostConfig(payload).subscribe(
      (response) => {
        alert("Client host config saved.");
        this.getClientHostConfigData();
      },
      (error) => {
        alert("Failed to save config.");
      }
    );
  }

  updateClientHostConfig() {
    if (!this.aggregatedDays || isNaN(this.aggregatedDays)) {
      alert("Please enter a valid aggregated days value.");
      return;
    }
    const payload = {
      clientName: "netraa",
      aggregatedDays: this.aggregatedDays,
      minRunTime: this.minRunTime
    };
    this.meteringConfigService.updateClientHostConfig(payload).subscribe(
      (response) => {
        alert("Client host config updated.");
        this.getClientHostConfigData();
      },
      (error) => {
        alert("Failed to update config.");
      }
    );
  }

  getZoneList() {
    this.meteringConfigService.getUniqueZones().subscribe({
      next: (response) => {
        if (response.serviceStatus.toLowerCase() === 'success') {
          this.zoneList = response.serviceResponse;
        } else {
          alert("Failed to fetch zones:");
        }
      },
      error: (err) => {
      }
    });
  }

  selectZone(zone: string, index: number): void {
    this.hostConfigs[index].zone = zone;
    this.zoneDropdownStates[index] = false;
  }

  hideDropdownWithDelay(index: number): void {
    setTimeout(() => {
      this.zoneDropdownStates[index] = false;
    }, 200);
  }

  // Tab management
  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  initResize(event: MouseEvent, colIndex: number) {
    event.preventDefault();

    const th = (event.target as HTMLElement).parentElement!;
    const startX = event.pageX;
    const startWidth = th.offsetWidth;

    const mouseMoveHandler = (e: MouseEvent) => {
      const newWidth = startWidth + (e.pageX - startX);
      if (newWidth > 30) { // minimum width limit to prevent too small columns
        th.style.width = newWidth + 'px';
      }
    };

    const mouseUpHandler = () => {
      window.removeEventListener('mousemove', mouseMoveHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
    };

    window.addEventListener('mousemove', mouseMoveHandler);
    window.addEventListener('mouseup', mouseUpHandler);
  }

  openHostSelectionModal(): void {
    this.modalSelectedHostIds.clear();
    this.selectedHostsClient.forEach(host => this.modalSelectedHostIds.add(host.id));

    this.meteringConfigService.getAllUnassignedHosts().subscribe({
      next: (unassignedHostsFromApi) => {
        let hostsToShowInModal: Host[] = [...unassignedHostsFromApi];
        const currentlyAssociatedHostIds = new Set(this.selectedHostsClient.map(h => h.id));
        this.selectedHostsClient.forEach(selectedHost => {
          if (!unassignedHostsFromApi.some(uh => uh.id === selectedHost.id)) {
            hostsToShowInModal.push(selectedHost);
          }
        });

        this.allHostsForModal = hostsToShowInModal;

        // Open the modal
        const modalElement = document.getElementById('hostSelectionModal');
        if (modalElement) {
          const modal = new (window as any).bootstrap.Modal(modalElement);
          modal.show();
        }
      },
      error: (err) => {
        console.error('Error fetching hosts for modal:', err);
        alert('Failed to load available hosts for selection.');
      }
    });
  }

  isHostSelectedInModal(hostId: number): boolean {
    return this.modalSelectedHostIds.has(hostId);
  }

  toggleHostSelectionInModal(host: Host): void {
    if (this.modalSelectedHostIds.has(host.id)) {
      this.modalSelectedHostIds.delete(host.id);
    } else {
      this.modalSelectedHostIds.add(host.id);
    }
  }

  confirmHostSelection(): void {
    this.selectedHostsClient = this.allHostsForModal.filter(host =>
      this.modalSelectedHostIds.has(host.id)
    );
    this.closeModal('hostSelectionModal');
  }

  clearSelectedHost(hostIdToRemove: number): void {
    this.selectedHostsClient = this.selectedHostsClient.filter(host => host.id !== hostIdToRemove);
    this.modalSelectedHostIds.delete(hostIdToRemove);
  }

  openDeleteConfirmationModal(teamId: number): void {
    this.teamToDeleteId = teamId;
    const modalElement = document.getElementById('deleteConfirmationModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  closeModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
    // Clear viewing data when modal closes
    if (modalId === 'viewHostsModal') {
      this.viewingTeamName = '';
      this.hostsForViewing = [];
    }
  }
  toggleShowFull(teamId: number, field: keyof TeamFieldExpandedState): void {
    const teamState = this.initializeTeamExpandedState(teamId); // Ensure state exists and get it
    teamState[field] = !teamState[field]; // Accessing with 'field' now works correctly
  }
  private initializeTeamExpandedState(teamId: number): TeamFieldExpandedState {
    let state = this.teamFieldExpandedState.get(teamId);
    if (!state) {
      state = {
        name: false,
        description: false,
        host: false,
        createdOn: false
      };
      this.teamFieldExpandedState.set(teamId, state);
    }
    return state; // Return the state object
  }


  nextStep(stepNumber: number): void {
    if (stepNumber === 1) {
      if (this.isCreatingNewZone) {
        if (!this.zoneForm.name || !this.zoneForm.description) {
          this.showToastClient('Please fill in Zone Name and Description for the new zone.', 'error');
          return;
        }
      } else {
        if (!this.selectedZoneClient) {
          this.showToastClient('Please select an existing zone.', 'error');
          return;
        }
      }
    } else if (stepNumber === 2) {
      if (this.isAddingNewTeamInEditMode) {
        if (!this.teamForm.name || !this.teamForm.description) {
          this.showToastClient('Please fill in Team Name and Description for the new team.', 'error');
          return;
        }
      } else {
        if (!this.selectedTeam) {
          this.showToastClient('Please select an existing team.', 'error');
          return;
        }
      }
    }
    // else if (stepNumber === 3) {
    //   if (!this.softwareForm.name || !this.softwareForm.version) {
    //     this.showToastClient('Please fill in Software Name and Version.', 'error');
    //     return;
    //   }
    // } 
    else if (stepNumber === 3) {
      // This step's validation happens in submitForm for hosts
    }

    if (this.currentStep < this.steps.length) {
      this.steps[this.currentStep - 1].completed = true;
      this.steps[this.currentStep - 1].expanded = false;
      this.currentStep++;
      this.steps[this.currentStep - 1].expanded = true;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.steps[this.currentStep - 1].expanded = false;
      this.currentStep--;
      this.steps[this.currentStep - 1].expanded = true;
      this.steps[this.currentStep - 1].completed = false;
    }
  }

  goToStep(stepNumber: number): void {
    if (stepNumber <= this.currentStep || this.steps[stepNumber - 1].completed) {
      this.steps[this.currentStep - 1].expanded = false;
      this.currentStep = stepNumber;
      this.steps[this.currentStep - 1].expanded = true;
    }
  }

  submitForm(): void {
    if (this.selectedHostsClient.length === 0) {
      alert('Please add at least one host before submitting the form.');
      return;
    }

    let submittedZone: Zone;
    let submittedTeam: TeamStepper;
    let payloadZoneId: number | undefined = undefined;
    let payloadTeamId: number | undefined = undefined;

    // --- Process Zone Data ---
    if (this.isCreatingNewZone) {
      const { id, ...zoneFormWithoutId } = this.zoneForm;
      submittedZone = { id: this.generateFrontendTempId(), ...zoneFormWithoutId };
      payloadZoneId = undefined;
    } else {
      if (!this.selectedZoneClient) {
        alert('Zone information is missing for submission.');
        return;
      }
      submittedZone = this.selectedZoneClient;
      payloadZoneId = submittedZone.id;
    }

    // --- Process Team Data ---
    if (this.isAddingNewTeamInEditMode) {
      const { id, ...teamFormWithoutId } = this.teamForm;
      submittedTeam = { id: this.generateFrontendTempId(), ...teamFormWithoutId, zoneId: submittedZone.id };
      payloadTeamId = undefined;
    } else {
      if (!this.selectedTeam) {
        alert('Team information is missing for submission.');
        return;
      }
      submittedTeam = this.selectedTeam;
      payloadTeamId = submittedTeam.id;
    }
    

    // --- Construct HostGroupPayload for the submitted Team ---
    const submittedTeamHostGroupPayload: HostGroupPayload = {
      id: payloadTeamId,
      name: submittedTeam.name,
      description: submittedTeam.description,
      config: submittedTeam.config || {},
      filename: submittedTeam.filename || null,
      isNew: true,
      hosts: this.selectedHostsClient.map(host => ({ ...host }))
    };

    console.log('Submitted Team Host Group Payload:', JSON.stringify(submittedTeamHostGroupPayload, null, 2));

    // --- Construct ZonesDTO Payload ---
    const zonesDTOPayload: ZonesDTOPayload = {
      id: payloadZoneId,
      name: submittedZone.name,
      description: this.zoneForm.description,
      isNew: this.isCreatingNewZone,
      groups: []
    };

    console.log("ZOnePayload with Changed Description",zonesDTOPayload);

    if (this.isCreatingNewZone) {
      zonesDTOPayload.groups.push(submittedTeamHostGroupPayload);
    } else {
      const existingZoneData = this.allZones.find(z => z.id === submittedZone.id);
      console.log('Existing Zone Data:', JSON.stringify(existingZoneData, null, 2));

      const finalGroupsForZonePayload: HostGroupPayload[] = [];

      if (existingZoneData && existingZoneData.groups) {
        // Process existing groups
        existingZoneData.groups.forEach(groupDto => {
          if (!this.isAddingNewTeamInEditMode && groupDto.id === submittedTeam.id) {
            finalGroupsForZonePayload.push(submittedTeamHostGroupPayload);
            console.log('Added Updated Existing Team to Payload:', JSON.stringify(submittedTeamHostGroupPayload, null, 2));
          } else {
            finalGroupsForZonePayload.push(submittedTeamHostGroupPayload);
            const existingGroupHosts = this.allAssociatedHosts[groupDto.id!] || [];
            console.log('Existing Group Hosts:', JSON.stringify(existingGroupHosts, null, 2));
            finalGroupsForZonePayload.push({
              id: groupDto.id,
              name: groupDto.name,
              description: groupDto.description || '',
              config: {},
              filename: null,
              isNew: false
            });
            console.log('Added Existing Team to Payload:', JSON.stringify(finalGroupsForZonePayload, null, 2));
          }
        });
      }

      console.log('Final Groups for Zone Payload DEBUG:', JSON.stringify(finalGroupsForZonePayload, null, 2));

      if (this.isAddingNewTeamInEditMode) {
        finalGroupsForZonePayload.push(submittedTeamHostGroupPayload);
        console.log('Added New Team to Payload:', JSON.stringify(submittedTeamHostGroupPayload, null, 2));
      }
      const uniqueGroupsForZonePayload = finalGroupsForZonePayload.filter((group, index, self) =>
        index === self.findIndex(g => g.id === group.id)
      );

      finalGroupsForZonePayload.length = 0;
      uniqueGroupsForZonePayload.forEach(group => finalGroupsForZonePayload.push(group));

      zonesDTOPayload.groups = finalGroupsForZonePayload;
    }

    // --- Execute API Call ---
    let apiCall: Observable<any>;
    if (this.isCreatingNewZone) {
      console.log('Final ZonesDTO Payload NewZone:', JSON.stringify(zonesDTOPayload, null, 2));
      apiCall = this.meteringConfigService.createZone(zonesDTOPayload);
    } else {
      console.log('Final ZonesDTO Payload UpdateZone:', JSON.stringify(zonesDTOPayload, null, 2));
      apiCall = this.meteringConfigService.updateZone(zonesDTOPayload);
    }

    apiCall.subscribe({
      next: (response) => {
        if (response && response.serviceStatus === 'Success') {
          alert('Configuration saved successfully!');
          this.loadAllZonesAndTeams();
          this.isFormSubmitted = true;
          this.resetStepperState();
        } else {
          alert(`Failed to save configuration: ${response.serviceError || 'Unknown error'}`);
        }
      },
      error: (err) => {
        console.error('Error saving configuration:', err);
        alert('Error saving configuration. Please check console for details.');
      }
    });
  }



  resetStepperState(): void {
    this.currentStep = 1;
    this.steps.forEach(step => {
      step.completed = false;
      step.expanded = false;
    });
    this.steps[0].expanded = true;

    // Reset form data to defaults
    this.zoneForm = { id: 0, name: '', description: '' };
    this.teamForm = { id: 0, name: '', description: '', zoneId: 0 };
    this.selectedZoneClient = null;
    this.selectedTeam = null;
    this.softwareForm = { name: '', version: '' };
    this.selectedHostsClient = [];
    this.modalSelectedHostIds.clear();

    this.isEditingFromTable = false;
    this.editingAssetContext = null;
    this.isAddingNewTeamInEditMode = false;
    this.isCreatingNewZone = false; 
    this.isAddingNewZoneDirectly = false;
  }

  private generateFrontendTempId(): number {
    return Math.floor(Math.random() * 1_000_000) + Date.now();
  }

  editAssetFromTable(assetData: FinalAssetData): void {
    this.resetStepperState(); 
    this.isFormSubmitted = false; 
    this.isEditingFromTable = true; 
    this.editingAssetContext = { ...assetData }; 

    // --- Pre-fill Stage 1 (Zone) ---
    this.isCreatingNewZone = false; 
    this.selectedZoneClient = this.allZones.find(z => z.id === assetData.zoneId) || null;
    if (this.selectedZoneClient) {
      this.zoneForm = { ...this.selectedZoneClient }; 
    } else {
      this.zoneForm = { id: assetData.zoneId, name: assetData.zoneName, description: 'Zone not found' };
    }

    // --- Pre-fill Stage 2 (Team) ---
    this.isAddingNewTeamInEditMode = false;
    this.selectedTeam = this.allTeamsAcrossAllZones.find(t => t.id === assetData.teamId) || null;
    if (this.selectedTeam) {
      this.teamForm = { ...this.selectedTeam }; 
    } else {
      this.teamForm = { id: assetData.teamId, name: assetData.teamName, description: 'Team not found', zoneId: assetData.zoneId };
    }

    // --- Load Hosts for Stage 4 (Add Hosts) ---
    if (assetData.teamId) {
      this.meteringConfigService.getGroupDetails(assetData.teamId).subscribe({
        next: (response: HostGroupDetailsResponse | null) => {
          if (response && response.hosts) {
            this.selectedHostsClient = response.hosts;
          } else {
            this.selectedHostsClient = [];
            console.warn('No hosts found for this team when editing:', assetData.teamId);
          }
        },
        error: (err) => {
          console.error('Error fetching hosts for editing team:', err);
          this.selectedHostsClient = [];
        }
      });
    } else {
      this.selectedHostsClient = [];
    }

    this.goToStep(1); 
  }

  addZoneFromButton(): void {
    this.resetStepperState(); 
    this.isFormSubmitted = false;
    this.isAddingNewZoneDirectly = true;
    this.isCreatingNewZone = true;
    this.selectedZoneClient = null;
    this.zoneForm = { id: 0, name: '', description: '' };
    this.goToStep(1);
  }

  addTeamToZone(zoneId: number): void {
    this.resetStepperState();
    this.isFormSubmitted = false;

    this.isCreatingNewZone = false;
    this.selectedZoneClient = this.allZones.find(z => z.id === zoneId) || null;
    if (!this.selectedZoneClient) {
      alert('Error: Could not find the selected zone to add team to.');
      this.isFormSubmitted = true;
      return;
    }
    this.zoneForm = { ...this.selectedZoneClient };

    this.isAddingNewTeamInEditMode = true;
    this.selectedTeam = null;
    this.teamForm = { id: 0, name: '', description: '', zoneId: this.selectedZoneClient.id };

    this.goToStep(2); 
  }

  configZone(zone: Zone): void {
    this.resetStepperState(); 
    this.isFormSubmitted = false; 
    this.isConfiguringZone = true;
    this.configuringZoneContext = { ...zone }; 

    this.isCreatingNewZone = false;
    this.selectedZoneClient = zone;
    this.zoneForm = { ...zone };

    this.goToStep(1); 
  }

  deleteZone(zoneId: number): void {
    if (confirm(`Are you sure you want to delete Zone with ID: ${zoneId}? This action cannot be undone.`)) {
      console.log(`Deleting Zone with ID: ${zoneId}`);
      this.meteringConfigService.deleteZone({ id: zoneId }).subscribe({
        next: (response) => {
          if (response && response.serviceStatus === 'Success') {
            alert(`Zone ${zoneId} deleted successfully!`);
            this.loadAllZonesAndTeams(); 
          } else {
            alert(`Failed to delete Zone ${zoneId}: ${response.serviceError || 'Unknown error'}`);
          }
        },
        error: (err) => {
          console.error(`Error deleting Zone ${zoneId}:`, err);
          alert('API Error: Failed to delete zone.');
        }
      });
    }
  }

  getZoneName(zoneId: number | undefined): string {
    if (zoneId === undefined || zoneId === null) { return 'N/A'; }
    const zone = this.allZones.find(z => z.id === zoneId);
    return zone ? zone.name : 'N/A';
  }

  toggleAddTeamInEditMode(): void {
    this.isAddingNewTeamInEditMode = !this.isAddingNewTeamInEditMode;
    if (this.isAddingNewTeamInEditMode) { 
      this.teamForm = { id: 0, name: '', description: '', zoneId: this.currentZoneIdForTeamCreation() }; 
      this.selectedTeam = null;
    } else {
      if (this.isEditingFromTable && this.editingAssetContext) {
        this.selectedTeam = this.allTeamsAcrossAllZones.find(t => t.id === this.editingAssetContext?.teamId) || null;
      } else {
        this.selectedTeam = null;
      }
      if (this.selectedTeam) {
        this.teamForm = { ...this.selectedTeam };
      } else {
        this.teamForm = { id: 0, name: '', description: '', zoneId: 0 };
      }
    }
  }

  toggleAddNewZoneInput(): void {
    this.isCreatingNewZone = !this.isCreatingNewZone;
    if (this.isCreatingNewZone) { 
      this.zoneForm = { id: 0, name: '', description: '' }; 
      this.selectedZoneClient = null;
    } else { 
      if (this.isEditingFromTable && this.editingAssetContext) {
        this.selectedZoneClient = this.allZones.find(z => z.id === this.editingAssetContext?.zoneId) || null;
      } else if (this.isAddingNewZoneDirectly) {
        
        this.selectedZoneClient = null;
      }
      if (this.selectedZoneClient) {
        this.zoneForm = { ...this.selectedZoneClient };
      } else {
        this.zoneForm = { id: 0, name: '', description: '' };
      }
    }
  }

  onZoneSelected(): void {
    if (this.selectedZoneClient) {
      this.zoneForm = { ...this.selectedZoneClient };
    } else {
      this.zoneForm = { id: 0, name: '', description: '' }; 
    }
    this.selectedTeam = null;
    this.teamForm = { id: 0, name: '', description: '', zoneId: this.currentZoneIdForTeamCreation() };
  }

  onTeamSelected(): void {
    if (this.selectedTeam) {
      this.teamForm = { ...this.selectedTeam }; 
      if (this.selectedTeam.id) { 
        this.selectedHostsClient = []; 
        this.meteringConfigService.getGroupDetails(this.selectedTeam.id).subscribe({
          next: (response: HostGroupDetailsResponse | null) => {
            if (response && response.hosts) {
              this.selectedHostsClient = response.hosts;
              console.log(`Loaded hosts for team ${this.selectedTeam?.name}:`, this.selectedHostsClient);
            } else {
              this.selectedHostsClient = [];
              console.warn('No hosts found for selected team or API response empty.');
            }
          },
          error: (err) => {
            console.error('Error fetching hosts for selected team:', err);
            this.selectedHostsClient = [];
            alert('Failed to load hosts for the selected team.');
          }
        });
      } else {
        this.selectedHostsClient = [];
      }
    } else {
      this.teamForm = { id: 0, name: '', description: '', zoneId: this.currentZoneIdForTeamCreation() };
      this.selectedHostsClient = [];
    }
  }

  get filteredTeamsByZone(): TeamStepper[] {
    let currentZoneId: number | null = null;

    if (this.isConfiguringZone && this.configuringZoneContext) {
      currentZoneId = this.configuringZoneContext.id;
    } else if (!this.isCreatingNewZone && this.selectedZoneClient) {
      currentZoneId = this.selectedZoneClient.id;
    } else if (this.isCreatingNewZone && this.zoneForm.id !== 0) {
      currentZoneId = this.zoneForm.id;
    } else if (this.isEditingFromTable && this.editingAssetContext) {
      currentZoneId = this.editingAssetContext.zoneId;
    }

    let teamsForSelectedZone: TeamStepper[] = [];
    if (currentZoneId !== null) {
      teamsForSelectedZone = this.allTeamsAcrossAllZones.filter(team => team.zoneId === currentZoneId);
    }

    const combinedTeams = [...teamsForSelectedZone, ...this.unassignedTeams];

    combinedTeams.sort((a, b) => a.name.localeCompare(b.name));

    return combinedTeams;
  }

  currentZoneIdForTeamCreation(): number {
    if (this.isCreatingNewZone && this.zoneForm.id !== 0) { return this.zoneForm.id; }
    if (this.selectedZoneClient) { return this.selectedZoneClient.id; }
    if (this.editingAssetContext) { return this.editingAssetContext.zoneId; }
    return 0; 
  }

  processFinalAssetTableData(allZonesFromApi: ZoneDetailsResponse[]): void {
    const groupedData: { [zoneId: number]: GroupedAssetsByZone } = {};

    const assignedZones = allZonesFromApi.filter(zoneDto => zoneDto.id !== -1);

    assignedZones.forEach(zoneDto => {
      groupedData[zoneDto.id] = {
        zone: { id: zoneDto.id, name: zoneDto.name, description: zoneDto.description || '' },
        assets: []
      };
    });

    this.finalAssetTableData.forEach(asset => {
      if (groupedData[asset.zoneId]) {
        groupedData[asset.zoneId].assets.push(asset);
      } else {
        console.warn(`Asset ${asset.assetId} refers to unknown zoneId ${asset.zoneId} or an unassigned zone.`);
      }
    });

    this.groupedFinalAssetTableData = Object.values(groupedData);
    this.groupedFinalAssetTableData.sort((a, b) => a.zone.name.localeCompare(b.zone.name));

    this.groupedFinalAssetTableData.forEach(zoneGroup => {
      zoneGroup.assets.forEach(asset => {
      });
    });
  }

  cancelEdit(): void {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      this.isFormSubmitted = true;
      this.resetStepperState();
    }
  }

  showAssociatedHosts(teamAsset: FinalAssetData): void {
    if (!teamAsset.teamId) {
      alert('Cannot retrieve host details: Team ID is missing.');
      return;
    }

    this.viewingTeamName = teamAsset.teamName;
    this.hostsForViewing = [];

    this.meteringConfigService.getGroupDetails(teamAsset.teamId).subscribe({
      next: (response: HostGroupDetailsResponse | null) => {
        if (response && response.hosts) {
          this.hostsForViewing = response.hosts;
          this.allAssociatedHosts[teamAsset.teamId] = response.hosts;
          console.log(`Hosts for team ${teamAsset.teamName}:`, this.hostsForViewing);
          this.openModal('viewHostsModal');
        } else {
          alert('No host details found for this team.');
        }
      },
      error: (err) => {
        console.error('Error fetching group details:', err);
        alert('Failed to load host details for this team.');
      }
    });
  }

  openModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  confirmModal = {
    visible: false,
    message: '',
    onConfirm: () => { }
  };

  openConfirmModal(message: string, onConfirm: () => void) {
    this.confirmModal.message = message;
    this.confirmModal.onConfirm = onConfirm;
    this.confirmModal.visible = true;
  }

  confirmModalConfirm() {
    this.confirmModal.onConfirm();
    this.confirmModal.visible = false;
  }

  confirmModalCancel() {
    this.confirmModal.visible = false;
  }

  showToastClient(message: string, type: 'success' | 'error') {
    this.toast.message = message;
    this.toast.type = type;
    this.toast.visible = true;

    setTimeout(() => {
      this.toast.visible = false;
    }, 3000);
  }

  deleteTeamFromZone(asset: FinalAssetData): void {
    if (confirm(`Are you sure you want to delete team '${asset.teamName}' from Zone ${asset.zoneName}?`)) {
      
      console.log(`Deleting team '${asset.teamName}' from Zone ${asset.zoneName}`);
      console.log("Team Data:", JSON.stringify(asset, null, 2));
      const teamDeleteZonePayload: ZonesDTOPayload = {
        id: asset.zoneId,
        name: asset.zoneName,
        description: '', 
        isNew: false,
        groups: []
      };
      console.log("Team Delete Zone Payload:", JSON.stringify(teamDeleteZonePayload, null, 2));
      
      this.allZones.forEach(zone => {
        if (zone.id === asset.zoneId) {
          if (zone.groups) {
            zone.groups.forEach(team => {
              if (team.id !== asset.teamId) { 
                teamDeleteZonePayload.groups.push({
                  id: team.id,
                  name: team.name,
                  description: team.description || '',
                  config: team.config || {},
                  filename: team.filename || null,
                  isNew: false,
                  hosts: this.allAssociatedHosts[team.id] || []
                });
              }
            });
          }
        }
      });
      console.log("Final Team Delete Zone Payload:", JSON.stringify(teamDeleteZonePayload, null, 2));
      
      this.meteringConfigService.updateZoneGroupMapping(teamDeleteZonePayload).subscribe({
        next: (response) => {
          if (response && response.serviceStatus === 'Success') {
            this.showToastClient(`Team '${asset.teamName}' deleted from Zone '${asset.zoneName}' successfully!`, 'success');
            this.loadAllZonesAndTeams(); 
          }
          else {
            this.showToastClient(`Failed to delete team: ${response.serviceError || 'Unknown error'}`, 'error');
          }
        },
        error: (err) => {
          console.error('Error deleting team from zone:', err);
          this.showToastClient('Error deleting team from zone. Please check console for details.', 'error');
        }
      });
    };
  }

  get connectedZoneDropLists(): string[] {
    return this.groupedFinalAssetTableData.map(zoneGroup => zoneGroup.zone.id.toString());
  }

  drop(event: CdkDragDrop<FinalAssetData[]>) {
    const previousZoneId = parseInt(event.previousContainer.id, 10);
    const currentZoneId = parseInt(event.container.id, 10);

    const movedAsset: FinalAssetData = event.previousContainer.data[event.previousIndex];

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      console.log(`Reordered team '${movedAsset.teamName}' within Zone ${previousZoneId}`);
      return; 
    }

    console.log(`Moving team '${movedAsset.teamName}' from Zone ${previousZoneId} to Zone ${currentZoneId}`);

    
    movedAsset.zoneId = currentZoneId;
    movedAsset.zoneName = this.allZones.find(z => z.id === currentZoneId)?.name || 'Unknown Zone';

    const teamToUpdateInAllTeams = this.allTeamsAcrossAllZones.find(t => t.id === movedAsset.teamId);
    if (teamToUpdateInAllTeams) {
      teamToUpdateInAllTeams.zoneId = currentZoneId;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    const sourceZone = this.allZones.find(z => z.id === previousZoneId);
    const targetZone = this.allZones.find(z => z.id === currentZoneId);

    if (!sourceZone || !targetZone) {
      console.error('Error: Could not find source or target zone in stored data');
      this.showToast('Error: Could not complete the move operation. Please refresh and try again.', '#ff6161', '#000000');
      this.loadAllZonesAndTeams();
      return;
    }

    const movedTeamHostGroupPayload: HostGroupPayload = {
      id: movedAsset.teamId,
      name: movedAsset.teamName,
      description: this.allTeamsAcrossAllZones.find(t => t.id === movedAsset.teamId)?.description || '',
      config: {},
      filename: null,
      isNew: false,
      hosts: this.allAssociatedHosts[movedAsset.teamId] || []
    };

    const sourceZonePayload: ZonesDTOPayload = {
      id: sourceZone.id,
      name: sourceZone.name,
      description: sourceZone.description,
      isNew: false,
      groups: []
    };

    if (sourceZone.groups) {
      sourceZone.groups
        .filter(team => team.id !== movedAsset.teamId)
        .forEach(team => {
          sourceZonePayload.groups.push({
            id: team.id,
            name: team.name,
            description: team.description || '',
            config: team.config || {},
            filename: team.filename || null,
            isNew: false,
            hosts: this.allAssociatedHosts[team.id] || []
          });
        });
    }

    const targetZonePayload: ZonesDTOPayload = {
      id: targetZone.id,
      name: targetZone.name,
      description: targetZone.description,
      isNew: false,
      groups: []
    };

    if (targetZone.groups) {
      targetZone.groups
        .filter(team => team.id !== movedAsset.teamId) 
        .forEach(team => {
          targetZonePayload.groups.push({
            id: team.id,
            name: team.name,
            description: team.description || '',
            config: team.config || {},
            filename: team.filename || null,
            isNew: false,
            hosts: this.allAssociatedHosts[team.id] || []
          });
        });
    }

    targetZonePayload.groups.push(movedTeamHostGroupPayload);

    console.log('Source Zone Payload (removing team):', JSON.stringify(sourceZonePayload, null, 2));
    console.log('Target Zone Payload (adding team):', JSON.stringify(targetZonePayload, null, 2));

    this.meteringConfigService.updateZoneGroupMapping(targetZonePayload).subscribe({
      next: (targetResponse) => {
        if (targetResponse.serviceStatus === 'Success') {
          console.log(`Team added to Zone ${currentZoneId} successfully.`);
          this.showToast(`Team '${movedAsset.teamName}' moved to Zone '${targetZone.name}' successfully!`, '#c1ff9b', '#000000');
          this.loadAllZonesAndTeams(); 
        } else {
          console.error('Error adding team to target zone:', targetResponse.serviceError);
          this.showToast('Error: Failed to add team to new zone. Data might be inconsistent.', '#ff6161', '#000000');
          this.loadAllZonesAndTeams();
        }
      },
      error: (targetError) => {
        console.error('API Error adding team to target zone:', targetError);
        this.showToast('API Error: Failed to add team to new zone. Data might be inconsistent.', '#ff6161', '#000000');
        this.loadAllZonesAndTeams();
      }
    });
  }

}
