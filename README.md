# PublicadorSocial Admin

Panel de administración para PublicadorSocial construido con Angular 19.

## Framework y Arquitectura

- **Framework**: Angular 19.2.0
- **Arquitectura**: Clean Architecture con estructura modular por features
- **Componentes**: Standalone components (sin NgModules)
- **Estilos**: SCSS con variables CSS para temas claro/oscuro

## Estructura del Proyecto

```
src/app/
├── core/                    # Módulo core - Singleton services
│   ├── guards/             # Guards de autenticación
│   ├── interceptors/       # HTTP interceptors
│   ├── models/             # Modelos centrales
│   └── services/           # Servicios singleton
├── features/               # Features/Módulos por funcionalidad
│   ├── auth/               # Feature de autenticación
│   └── dashboard/          # Feature de dashboard
├── shared/                 # Módulo compartido
│   └── utils/              # Utilidades
└── app.component.*         # Componente raíz
```

## Desarrollo

Para iniciar el servidor de desarrollo:

```bash
npm install
ng serve
```

La aplicación estará disponible en `http://localhost:4200/`

## Construcción

Para construir el proyecto:

```bash
ng build
```

Los archivos compilados se guardarán en `dist/publicador-social-admin/`

## Testing

Para ejecutar las pruebas:

```bash
ng test
```

## Características

- ✅ Autenticación con JWT
- ✅ Interceptor HTTP para manejo de tokens
- ✅ Guards de rutas
- ✅ Internacionalización (es, en, pt)
- ✅ Sistema de temas (claro/oscuro/auto)
- ✅ Arquitectura modular y escalable
