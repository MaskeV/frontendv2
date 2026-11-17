import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthenticationService } from '../../../../services/authentication.service';
import { User } from '../../../../models/user';

@Component({
    selector: 'app-client',
    imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './client.component.html',
    styleUrl: './client.component.css'
})
export class ClientComponent implements OnInit {
  private authService = inject(AuthenticationService);
  private router = inject(Router);
  userType: string = '';

  ngOnInit(): void {
    this.authService.currentUser.subscribe((user: any | null) => {
      const userRoleRaw = user?.userType || user?.usertype || '';
      this.userType = userRoleRaw.toString().trim().toLowerCase();
      
      // Redirect Admin to mapping view if they landed on the base client route
      if (this.userType === 'admin' && this.router.url.includes('/admin-config/client') && !this.router.url.includes('clientappmapping')) {
        this.router.navigate(['/admin-config/client/clientappmapping']);
      }
    });
  }
}