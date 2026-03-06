import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../admin/admin/services/admin.service';
import { AdminInfo, SensitiveData } from '../../../admin/admin/models/admin.model';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.scss'
})
export class DashboardOverviewComponent implements OnInit {
  adminInfo: AdminInfo | null = null;
  sensitiveData: SensitiveData | null = null;
  platformOwnerMessage: string | null = null;
  
  isLoading = false;
  isLoadingSensitive = false;
  isLoadingOwner = false;
  errorMessage = '';
  sensitiveErrorMessage = '';
  ownerErrorMessage = '';

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadAdminInfo();
    this.loadSensitiveData();
    this.loadPlatformOwnerData();
  }

  loadAdminInfo(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminService.getAdminInfo().subscribe({
      next: (response) => {
        this.adminInfo = response.data;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al cargar información del admin';
        this.isLoading = false;
      }
    });
  }

  loadSensitiveData(): void {
    this.isLoadingSensitive = true;
    this.sensitiveErrorMessage = '';

    this.adminService.getSensitiveData().subscribe({
      next: (response) => {
        this.sensitiveData = response.data;
        this.isLoadingSensitive = false;
      },
      error: (error) => {
        // No mostrar error si es 403 (sin permisos), es esperado
        if (error.status !== 403) {
          this.sensitiveErrorMessage = error.message || 'Error al cargar datos sensibles';
        }
        this.isLoadingSensitive = false;
      }
    });
  }

  loadPlatformOwnerData(): void {
    this.isLoadingOwner = true;
    this.ownerErrorMessage = '';

    this.adminService.getPlatformOwnerData().subscribe({
      next: (response) => {
        this.platformOwnerMessage = response.data;
        this.isLoadingOwner = false;
      },
      error: (error) => {
        // No mostrar error si es 403 (sin permisos), es esperado
        if (error.status !== 403) {
          this.ownerErrorMessage = error.message || 'Error al cargar datos de PlatformOwner';
        }
        this.isLoadingOwner = false;
      }
    });
  }

  hasRole(role: string): boolean {
    return this.adminInfo?.InternalRoles?.includes(role) || false;
  }

  isPlatformOwner(): boolean {
    return this.hasRole('PlatformOwner');
  }

  isPlatformSupport(): boolean {
    return this.hasRole('PlatformSupport');
  }

  canViewSensitiveData(): boolean {
    return this.isPlatformOwner() || this.isPlatformSupport();
  }
}
