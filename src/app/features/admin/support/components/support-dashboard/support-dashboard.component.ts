import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-support-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './support-dashboard.component.html',
  styleUrl: './support-dashboard.component.scss'
})
export class SupportDashboardComponent {
  errors = [
    {
      id: 1,
      clientName: 'Empresa ABC',
      errorType: 'Token Expirado',
      message: 'Token de Facebook expirado para página "Mi Página Principal"',
      timestamp: '2024-01-15 14:30:00',
      severity: 'high'
    },
    {
      id: 2,
      clientName: 'Startup XYZ',
      errorType: 'Error de Sincronización',
      message: 'Error al sincronizar grupo "Grupo de Comunidad"',
      timestamp: '2024-01-15 10:15:00',
      severity: 'medium'
    }
  ];

  expiredTokens = [
    {
      clientId: 1,
      clientName: 'Empresa ABC',
      pageName: 'Mi Página Principal',
      expiredDate: '2024-01-14',
      daysExpired: 1
    },
    {
      clientId: 2,
      clientName: 'Startup XYZ',
      pageName: 'Página de Prueba',
      expiredDate: '2024-01-10',
      daysExpired: 5
    }
  ];

  syncQueue = [
    {
      id: 1,
      clientName: 'Empresa ABC',
      itemType: 'Página',
      itemName: 'Mi Página Principal',
      status: 'Pendiente',
      scheduledAt: '2024-01-15 15:00:00'
    },
    {
      id: 2,
      clientName: 'Startup XYZ',
      itemType: 'Grupo',
      itemName: 'Grupo de Comunidad',
      status: 'En Proceso',
      scheduledAt: '2024-01-15 14:45:00'
    }
  ];

  userLogs = [
    {
      userId: 1,
      userName: 'Usuario Admin',
      clientName: 'Empresa ABC',
      action: 'Publicación programada',
      timestamp: '2024-01-15 13:20:00',
      details: 'Post programado para 2024-01-16 10:00'
    },
    {
      userId: 2,
      userName: 'Usuario Editor',
      clientName: 'Startup XYZ',
      action: 'Conexión Facebook',
      timestamp: '2024-01-15 12:00:00',
      details: 'Nueva página conectada'
    }
  ];

  getSeverityClass(severity: string): string {
    return `severity-${severity}`;
  }

  retrySync(itemId: number) {
    if (confirm('¿Reintentar sincronización?')) {
      console.log('Retrying sync for item:', itemId);
    }
  }

  viewLogs(userId: number) {
    const logs = this.userLogs.filter(log => log.userId === userId);
    alert(`Logs para usuario ${userId}:\n\n${logs.map(log => `${log.timestamp}: ${log.action} - ${log.details}`).join('\n')}`);
  }
}
