import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../../../services/application.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-log-retention-archiving',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './log-retention-archiving.component.html',
  styleUrls: ['./log-retention-archiving.component.css']
})
export class LogRetentionArchivingComponent implements OnInit {

  showTable: boolean = false;
  isUpdation: boolean = false;
  configurations: any[] = [];
  configId: any = null;

  // Section 1: Storage Configuration
  storageType: string = 'Local/Shared Network Drive'; // Ignoring S3
  directoryPath: string = '';

  // Section 2: Backup Schedule
  targetIndexPattern: string = '';
  archiveFrequency: string = 'Daily at Midnight';
  customCron: string = '';
  archiveRetentionLimit: number | null = 365;
  keepArchivesForever: boolean = false;

  // Section 3: Active Data Policy
  activeDataRetention: number = 30;
  rolloverSizeLimit: number = 50;

  constructor(private applicationService: ApplicationService) { }

  ngOnInit(): void {
    this.getAllConfigurations();
  }

  toggleView() {
    this.showTable = !this.showTable;
    if (!this.showTable) {
      this.resetForm();
    }
  }

  getAllConfigurations() {
    this.applicationService.getAllLogArchiveConfigurations().subscribe({
      next: (response: any) => {
        if (response.serviceStatus === 'Success') {
          this.configurations = response.serviceResponse || [];
        } else {
          console.error('Failed to fetch configurations:', response.serviceResponse);
        }
      },
      error: (error: any) => {
        console.error('Error fetching configurations:', error);
      }
    });
  }

  editConfiguration(config: any) {
    this.isUpdation = true;
    this.showTable = false;
    this.configId = config.id;
    this.storageType = config.storageType || 'Local/Shared Network Drive';
    this.directoryPath = config.directoryPath || '';
    this.targetIndexPattern = config.targetIndexPattern || '';
    this.archiveFrequency = config.archiveFrequency || 'Daily at Midnight';
    if (this.archiveFrequency === 'Custom') {
      this.customCron = config.customCron || '';
    }
    this.archiveRetentionLimit = config.archiveRetentionLimit;
    this.keepArchivesForever = config.keepArchivesForever || false;
    this.activeDataRetention = config.activeDataRetention || 30;
    this.rolloverSizeLimit = config.rolloverSizeLimit || 50;
  }

  resetForm() {
    this.isUpdation = false;
    this.configId = null;
    this.storageType = 'Local/Shared Network Drive';
    this.directoryPath = '';
    this.targetIndexPattern = '';
    this.archiveFrequency = 'Daily at Midnight';
    this.customCron = '';
    this.archiveRetentionLimit = 365;
    this.keepArchivesForever = false;
    this.activeDataRetention = 30;
    this.rolloverSizeLimit = 50;
  }

  onKeepForeverChange() {
    if (this.keepArchivesForever) {
      this.archiveRetentionLimit = null;
    } else {
      this.archiveRetentionLimit = 365;
    }
  }

  saveConfiguration() {
    const payload: any = {
      storageType: this.storageType,
      directoryPath: this.directoryPath,
      targetIndexPattern: this.targetIndexPattern,
      archiveFrequency: this.archiveFrequency,
      customCron: this.archiveFrequency === 'Custom' ? this.customCron : null,
      archiveRetentionLimit: this.archiveRetentionLimit,
      keepArchivesForever: this.keepArchivesForever,
      activeDataRetention: this.activeDataRetention,
      rolloverSizeLimit: this.rolloverSizeLimit
    };

    if (this.isUpdation) {
      payload['id'] = this.configId;
      console.log('Updating Log Retention Configuration:', payload);
      this.applicationService.updateLogArchiveConfiguration(payload).subscribe({
        next: (response: any) => {
          if (response.serviceStatus === 'Success') {
            Swal.fire('Success', 'Configuration updated successfully', 'success');
            this.getAllConfigurations();
            this.showTable = true;
          } else {
            Swal.fire('Error', response.serviceResponse || 'Failed to update configuration', 'error');
          }
        },
        error: (error: any) => {
          console.error('Error updating configuration:', error);
          Swal.fire('Error', 'An error occurred while updating the configuration', 'error');
        }
      });
    } else {
      console.log('Saving Log Retention Configuration:', payload);
      this.applicationService.saveLogArchiveConfiguration(payload).subscribe({
        next: (response: any) => {
          if (response.serviceStatus === 'Success') {
            Swal.fire('Success', 'Configuration saved successfully', 'success');
            this.getAllConfigurations();
            this.showTable = true;
          } else {
            Swal.fire('Error', response.serviceResponse || 'Failed to save configuration', 'error');
          }
        },
        error: (error: any) => {
          console.error('Error saving configuration:', error);
          Swal.fire('Error', 'An error occurred while saving the configuration', 'error');
        }
      });
    }
  }

  deleteConfiguration(id: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this configuration!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it'
    }).then((result) => {
      if (result.isConfirmed) {
        this.applicationService.deleteLogArchiveConfiguration(id).subscribe({
          next: (response: any) => {
            if (response.serviceStatus === 'Success') {
              Swal.fire('Deleted!', 'Configuration has been deleted.', 'success');
              this.getAllConfigurations();
            } else {
              Swal.fire('Error', response.serviceResponse || 'Failed to delete configuration', 'error');
            }
          },
          error: (error: any) => {
            console.error('Error deleting configuration:', error);
            Swal.fire('Error', 'An error occurred while deleting the configuration', 'error');
          }
        });
      }
    });
  }
}
