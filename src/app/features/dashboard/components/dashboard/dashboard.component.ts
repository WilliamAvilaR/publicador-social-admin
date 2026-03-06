import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AdminService } from '../../../admin/admin/services/admin.service';
import { AdminInfo } from '../../../admin/admin/models/admin.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  user: AdminInfo | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.loadAdminInfo();
  }

  loadAdminInfo(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminService.getAdminInfo().subscribe({
      next: (response) => {
        this.user = response.data;
        this.isLoading = false;
      },
      error: (error) => {
        // Si falla, intentar obtener del AuthService como fallback
        const fallbackUser = this.authService.getUser();
        if (fallbackUser) {
          this.user = {
            UserId: fallbackUser.idUsuario?.toString() || '',
            Email: fallbackUser.email || '',
            FullName: fallbackUser.fullName || '',
            UserType: 'Internal',
            InternalRoles: []
          };
        }
        this.errorMessage = error.message || 'Error al cargar información del usuario';
        this.isLoading = false;
      }
    });
  }

  logout() {
    this.authService.logout();
    window.location.href = '/login';
  }

  hasRole(role: string): boolean {
    return this.user?.InternalRoles?.includes(role) || false;
  }

  isPlatformOwner(): boolean {
    return this.hasRole('PlatformOwner');
  }

  isPlatformSupport(): boolean {
    return this.hasRole('PlatformSupport');
  }
}
