import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-crash-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './crash-overview.component.html',
  styleUrls: ['./crash-overview.component.scss']
})
export class CrashOverviewComponent {
  @Input() context: any;
}
