import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { PlanFormComponent } from './plan-form.component';
import { PlansService } from '../../services/plans.service';

describe('PlanFormComponent', () => {
  const params$ = new BehaviorSubject<Record<string, string>>({ id: 'nuevo' });
  const router = {
    navigate: vi.fn(),
    createUrlTree: vi.fn(() => ({})),
    serializeUrl: vi.fn(() => ''),
  };
  const definitions = {
    data: {
      features: [{ key: 'f1', name: 'F1', category: 'module' }],
      limits: [{ key: 'l1', name: 'L1', category: 'c', dependsOnFeatures: [] }],
    },
  };
  const plansService = {
    getPlanDefinitions: vi.fn(() => of(definitions as any)),
    createPlan: vi.fn(() => of({ data: { message: 'Plan creado' } } as any)),
    updatePlan: vi.fn(() => of({} as any)),
    updatePlanFeatures: vi.fn(() => of({} as any)),
    updatePlanLimits: vi.fn(() =>
      of({ data: { message: 'Límites ok' } } as any),
    ),
    getPlanByCode: vi.fn(() =>
      of({
        data: {
          PlanId: 9,
          Code: 'pro',
          Name: 'Pro',
          Description: '',
          IsDefault: false,
          IsPaid: true,
          IsActive: true,
          Price: 10,
          CreatedAt: '',
          Features: [],
          Limits: [],
        },
      } as any),
    ),
  };

  afterEach(() => {
    vi.mocked(plansService.getPlanByCode).mockReset();
    vi.mocked(plansService.getPlanByCode).mockImplementation(() =>
      of({
        data: {
          PlanId: 9,
          Code: 'pro',
          Name: 'Pro',
          Description: '',
          IsDefault: false,
          IsPaid: true,
          IsActive: true,
          Price: 10,
          CreatedAt: '',
          Features: [],
          Limits: [],
        },
      } as any),
    );
    vi.mocked(plansService.getPlanDefinitions).mockReset();
    vi.mocked(plansService.getPlanDefinitions).mockImplementation(() =>
      of(definitions as any),
    );
    vi.mocked(plansService.createPlan).mockReset();
    vi.mocked(plansService.createPlan).mockImplementation(() =>
      of({ data: { message: 'Plan creado' } } as any),
    );
  });

  beforeEach(() => {
    params$.next({ id: 'nuevo' });
    TestBed.configureTestingModule({
      imports: [PlanFormComponent],
      providers: [
        { provide: PlansService, useValue: plansService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { params: params$.asObservable() } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('ruta sin id no activa modo edición', () => {
    params$.next({});
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isEditMode).toBe(false);
    expect(plansService.getPlanByCode).not.toHaveBeenCalled();
  });

  it('modo creación: carga definiciones sin pedir plan por código', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    expect(plansService.getPlanDefinitions).toHaveBeenCalled();
    expect(plansService.getPlanByCode).not.toHaveBeenCalled();
    expect(fixture.componentInstance.isEditMode).toBe(false);
  });

  it('modo edición: carga plan por código', () => {
    params$.next({ id: 'pro' });
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isEditMode).toBe(true);
    expect(plansService.getPlanByCode).toHaveBeenCalledWith('pro');
    expect(fixture.componentInstance.formData.Code).toBe('pro');
  });

  it('toggleFeature y updateLimit actualizan mapas', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.selectedFeatures.set('a', false);
    c.toggleFeature('a');
    expect(c.isFeatureEnabled('a')).toBe(true);
    c.toggleFeature('sin-previo');
    expect(c.isFeatureEnabled('sin-previo')).toBe(true);
    c.selectedFeatures.set('on', true);
    c.toggleFeature('on');
    expect(c.isFeatureEnabled('on')).toBe(false);
    c.updateLimit('k', '');
    expect(c.selectedLimits.get('k')).toBeNull();
    c.updateLimit('k', null as unknown as string);
    expect(c.selectedLimits.get('k')).toBeNull();
    c.updateLimit('k', '3');
    expect(c.selectedLimits.get('k')).toBe(3);
    expect(c.getLimitValue('k')).toBe('3');
    expect(c.getLimitValue('no-existe')).toBe('');
  });

  it('validateCurrentStep falla si faltan código o nombre', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.currentStep = 1;
    c.formData = {
      Code: '',
      Name: '',
      Description: '',
      IsDefault: false,
      IsPaid: false,
      IsActive: true,
      Price: null,
    };
    expect(c.validateCurrentStep()).toBe(false);
    expect(c.errorMessage).toContain('código');
    c.formData.Code = 'ok';
    expect(c.validateCurrentStep()).toBe(false);
    expect(c.errorMessage).toContain('nombre');
  });

  it('nextStep y previousStep navegan el wizard con formulario válido', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.formData.Code = 'code';
    c.formData.Name = 'Nombre';
    c.currentStep = 1;
    c.nextStep();
    expect(c.currentStep).toBe(2);
    c.previousStep();
    expect(c.currentStep).toBe(1);
    expect(c.showPreview).toBe(false);
  });

  it('goToStep permite saltar a paso ya visitado', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.formData.Code = 'c';
    c.formData.Name = 'N';
    c.currentStep = 3;
    c.goToStep(1);
    expect(c.currentStep).toBe(1);
  });

  it('getCategoryKeys devuelve claves del objeto', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    expect(c.getCategoryKeys({ a: [], b: [] })).toEqual(['a', 'b']);
  });

  it('savePlan en modo creación llama createPlan cuando el formulario es válido', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.formData = {
      Code: 'newplan',
      Name: 'Nuevo',
      Description: '',
      IsDefault: false,
      IsPaid: false,
      IsActive: true,
      Price: null,
    };
    c.currentStep = 1;
    c.savePlan();
    expect(plansService.createPlan).toHaveBeenCalled();
  });

  it('validateCurrentStep exige precio en planes de pago', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.currentStep = 1;
    c.formData = {
      Code: 'p',
      Name: 'P',
      Description: '',
      IsDefault: false,
      IsPaid: true,
      IsActive: true,
      Price: null,
    };
    expect(c.validateCurrentStep()).toBe(false);
    expect(c.errorMessage).toContain('precio');
    c.formData.Price = 9.99;
    expect(c.validateCurrentStep()).toBe(true);
  });

  it('validateCurrentStep en pasos 2+ no exige campos obligatorios', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.currentStep = 2;
    c.formData.Code = '';
    expect(c.validateCurrentStep()).toBe(true);
  });

  it('validateForm delega en validateCurrentStep', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.currentStep = 1;
    c.formData = {
      Code: 'ok',
      Name: 'ok',
      Description: '',
      IsDefault: false,
      IsPaid: false,
      IsActive: true,
      Price: null,
    };
    expect(c.validateForm()).toBe(true);
    c.formData.Name = '';
    expect(c.validateForm()).toBe(false);
  });

  it('savePlan no llama API si validateForm falla', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.formData = {
      Code: '',
      Name: 'x',
      Description: '',
      IsDefault: false,
      IsPaid: false,
      IsActive: true,
      Price: null,
    };
    c.currentStep = 1;
    vi.mocked(plansService.createPlan).mockClear();
    c.savePlan();
    expect(plansService.createPlan).not.toHaveBeenCalled();
  });

  it('createPlan ante error HTTP deja mensaje y desactiva guardado', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.formData = {
      Code: 'x',
      Name: 'y',
      Description: '',
      IsDefault: false,
      IsPaid: false,
      IsActive: true,
      Price: null,
    };
    c.currentStep = 1;
    c.isSaving = true;
    vi.mocked(plansService.createPlan).mockReturnValueOnce(
      throwError(() => new Error('red')),
    );
    c.savePlan();
    expect(c.errorMessage).toContain('red');
    expect(c.isSaving).toBe(false);
  });

  it('loadPlan ante error guarda mensaje', () => {
    params$.next({ id: 'pro' });
    vi.mocked(plansService.getPlanByCode).mockReturnValueOnce(
      throwError(() => new Error('no plan')),
    );
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.errorMessage).toContain('no plan');
    expect(fixture.componentInstance.isLoading).toBe(false);
  });

  it('cancel navega al listado admin de planes', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.componentInstance.cancel();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard/planes'], {
      queryParams: { subtab: 'admin' },
    });
  });

  it('nextStep no avanza si el paso actual es inválido', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.currentStep = 1;
    c.formData.Code = '';
    c.formData.Name = 'n';
    c.nextStep();
    expect(c.currentStep).toBe(1);
  });

  it('nextStep en último paso del wizard activa preview', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.formData = { Code: 'c', Name: 'n', Description: '', IsDefault: false, IsPaid: false, IsActive: true, Price: null };
    c.currentStep = 3;
    c.nextStep();
    expect(c.showPreview).toBe(true);
    expect(c.currentStep).toBe(4);
  });

  it('goToStep(2) desde paso 1 con datos válidos avanza', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.formData = { Code: 'c', Name: 'n', Description: '', IsDefault: false, IsPaid: false, IsActive: true, Price: null };
    c.currentStep = 1;
    c.goToStep(2);
    expect(c.currentStep).toBe(2);
  });

  it('previousStep no baja de paso 1', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.currentStep = 1;
    c.previousStep();
    expect(c.currentStep).toBe(1);
  });

  it('organizeLimitsByCategory no pisa un límite ya configurado', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.selectedLimits.set('keep', 42);
    c.limitsCatalog = [
      {
        Key: 'keep',
        Name: 'K',
        Description: '',
        Category: 'c',
        Unit: '',
        DependsOnFeatures: [],
      },
    ];
    c.organizeLimitsByCategory();
    expect(c.selectedLimits.get('keep')).toBe(42);
  });

  it('getRelatedLimits, shouldShowLimit, hints y getters de conteo', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.limitsCatalog = [
      { Key: 'L1', Name: 'Limite 1', Description: '', Category: 'c', Unit: '', DependsOnFeatures: ['f1'] },
      { Key: 'L2', Name: 'Limite 2', Description: '', Category: 'c', Unit: '', DependsOnFeatures: [] },
    ];
    expect(
      c.getRelatedLimits('f1').length,
    ).toBe(1);
    c.limitsCatalog.push({
      Key: 'orphan',
      Name: 'O',
      Description: '',
      Category: 'c',
      Unit: '',
    });
    expect(c.getRelatedLimits('anything').some((l) => l.Key === 'orphan')).toBe(false);
    expect(c.shouldShowLimit(c.limitsCatalog[1]!)).toBe(true);
    expect(c.shouldShowLimit(c.limitsCatalog[0]!)).toBe(false);
    c.selectedFeatures.set('f1', true);
    expect(c.shouldShowLimit(c.limitsCatalog[0]!)).toBe(true);
    const hint = c.getFeatureHint('f1');
    expect(hint).toContain('Limite 1');
    expect(c.getFeatureHintLines('f1').length).toBeGreaterThan(0);
    c.selectedFeatures.clear();
    c.selectedFeatures.set('a', true);
    c.selectedFeatures.set('b', false);
    expect(c.enabledFeaturesCount).toBe(1);
    expect(c.hasEnabledFeatures).toBe(true);
    c.selectedLimits.set('k', 1);
    c.selectedLimits.set('j', null);
    expect(c.configuredLimitsCount).toBe(1);
    expect(c.hasConfiguredLimits).toBe(true);
  });

  it('updateLimit con número inválido guarda null', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.updateLimit('k', 'x');
    expect(c.selectedLimits.get('k')).toBeNull();
  });

  it('savePlan en modo edición encadena updatePlan, features y límites', () => {
    params$.next({ id: 'pro' });
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.isEditMode).toBe(true);
    expect(c.planId).toBe(9);
    c.formData = {
      Code: 'pro',
      Name: 'Pro',
      Description: '',
      IsDefault: false,
      IsPaid: true,
      IsActive: true,
      Price: 10,
    };
    c.currentStep = 1;
    vi.mocked(plansService.updatePlan).mockClear();
    vi.mocked(plansService.updatePlanFeatures).mockClear();
    vi.mocked(plansService.updatePlanLimits).mockClear();
    c.savePlan();
    expect(plansService.updatePlan).toHaveBeenCalledWith(9, expect.any(Object));
    expect(plansService.updatePlanFeatures).toHaveBeenCalled();
    expect(plansService.updatePlanLimits).toHaveBeenCalled();
  });

  it('createPlan usa mensaje por defecto y navega tras el timeout', () => {
    vi.useFakeTimers();
    vi.mocked(plansService.createPlan).mockReturnValueOnce(of({ data: {} } as any));
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.formData = {
      Code: 'np',
      Name: 'N',
      Description: '',
      IsDefault: false,
      IsPaid: false,
      IsActive: true,
      Price: null,
    };
    c.currentStep = 1;
    c.savePlan();
    expect(c.successMessage).toBe('Plan creado correctamente');
    vi.advanceTimersByTime(1500);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard/planes'], {
      queryParams: { subtab: 'admin' },
    });
    vi.useRealTimers();
  });

  it('createPlan ante error sin message usa texto por defecto', () => {
    vi.mocked(plansService.createPlan).mockReturnValueOnce(
      throwError(() => ({ name: 'Http' } as Error)),
    );
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.formData = {
      Code: 'a',
      Name: 'b',
      Description: '',
      IsDefault: false,
      IsPaid: false,
      IsActive: true,
      Price: null,
    };
    c.currentStep = 1;
    c.savePlan();
    expect(c.errorMessage).toBe('Error al crear el plan');
  });

  it('updatePlan no llama API si planId es null', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.planId = null;
    vi.mocked(plansService.updatePlan).mockClear();
    c.updatePlan();
    expect(plansService.updatePlan).not.toHaveBeenCalled();
  });

  it('updatePlan: error al actualizar plan base', () => {
    params$.next({ id: 'pro' });
    vi.mocked(plansService.updatePlan).mockReturnValueOnce(
      throwError(() => new Error('base')),
    );
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.formData = {
      Code: 'pro',
      Name: 'Pro',
      Description: '',
      IsDefault: false,
      IsPaid: true,
      IsActive: true,
      Price: 10,
    };
    c.currentStep = 1;
    c.savePlan();
    expect(c.errorMessage).toContain('base');
    expect(c.isSaving).toBe(false);
  });

  it('updatePlan: error al actualizar features', () => {
    params$.next({ id: 'pro' });
    vi.mocked(plansService.updatePlan).mockReturnValueOnce(of({} as any));
    vi.mocked(plansService.updatePlanFeatures).mockReturnValueOnce(
      throwError(() => new Error('feat err')),
    );
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.formData = {
      Code: 'pro',
      Name: 'Pro',
      Description: '',
      IsDefault: false,
      IsPaid: true,
      IsActive: true,
      Price: 10,
    };
    c.currentStep = 1;
    c.savePlan();
    expect(c.errorMessage).toContain('feat err');
    expect(c.isSaving).toBe(false);
  });

  it('updatePlan: error al actualizar límites', () => {
    params$.next({ id: 'pro' });
    vi.mocked(plansService.updatePlan).mockReturnValueOnce(of({} as any));
    vi.mocked(plansService.updatePlanFeatures).mockReturnValueOnce(of({} as any));
    vi.mocked(plansService.updatePlanLimits).mockReturnValueOnce(
      throwError(() => new Error('lim err')),
    );
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.formData = {
      Code: 'pro',
      Name: 'Pro',
      Description: '',
      IsDefault: false,
      IsPaid: true,
      IsActive: true,
      Price: 10,
    };
    c.currentStep = 1;
    c.savePlan();
    expect(c.errorMessage).toContain('lim err');
    expect(c.isSaving).toBe(false);
  });

  it('updatePlan: mensaje por defecto y navegación tras timeout en éxito', () => {
    vi.useFakeTimers();
    params$.next({ id: 'pro' });
    vi.mocked(plansService.updatePlanLimits).mockReturnValueOnce(of({ data: {} } as any));
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.formData = {
      Code: 'pro',
      Name: 'Pro',
      Description: '',
      IsDefault: false,
      IsPaid: true,
      IsActive: true,
      Price: 10,
    };
    c.currentStep = 1;
    c.savePlan();
    expect(c.successMessage).toBe('Plan actualizado correctamente');
    vi.advanceTimersByTime(1500);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard/planes'], {
      queryParams: { subtab: 'admin' },
    });
    vi.useRealTimers();
  });

  it('loadPlan normaliza respuesta camelCase y omite feature/limit sin clave', () => {
    params$.next({ id: 'pro' });
    vi.mocked(plansService.getPlanByCode).mockReturnValueOnce(
      of({
        data: {
          planId: 42,
          code: 'mix',
          name: 'Mix',
          description: 'd',
          isDefault: false,
          isPaid: false,
          isActive: true,
          price: null,
          createdAt: 't',
          features: [
            { featureKey: 'ok', isEnabled: true },
            { featureKey: '', isEnabled: false },
          ],
          limits: [
            { limitKey: 'lk', value: 3 },
            { limitKey: '', value: 9 },
          ],
          featuresCount: 2,
          limitsCount: 2,
        },
      } as any),
    );
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.planId).toBe(42);
    expect(c.formData.Code).toBe('mix');
    expect(c.selectedFeatures.has('ok')).toBe(true);
    expect(c.selectedFeatures.has('')).toBe(false);
    expect(c.selectedLimits.get('lk')).toBe(3);
  });

  it('loadPlan sin planCode no llama al servicio', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.planCode = null;
    vi.mocked(plansService.getPlanByCode).mockClear();
    c.loadPlan();
    expect(plansService.getPlanByCode).not.toHaveBeenCalled();
  });

  it('loadPlan con Features y Limits solo en PascalCase', () => {
    params$.next({ id: 'pro' });
    vi.mocked(plansService.getPlanByCode).mockReturnValueOnce(
      of({
        data: {
          PlanId: 7,
          Code: 'pascal',
          Name: 'P',
          Description: 'D',
          IsDefault: true,
          IsPaid: false,
          IsActive: false,
          Price: null,
          CreatedAt: 'd',
          Features: [{ FeatureKey: 'F1', IsEnabled: true }],
          Limits: [{ LimitKey: 'L1', Value: 1 }],
          FeaturesCount: 1,
          LimitsCount: 1,
        },
      } as any),
    );
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.formData.IsActive).toBe(false);
    expect(c.selectedFeatures.get('F1')).toBe(true);
    expect(c.selectedLimits.get('L1')).toBe(1);
  });

  it('loadPlan sin data usa objeto vacío', () => {
    params$.next({ id: 'pro' });
    vi.mocked(plansService.getPlanByCode).mockReturnValueOnce(of({} as any));
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.formData.Code).toBeUndefined();
    expect(c.isLoading).toBe(false);
  });

  it('loadPlan ante error sin message usa texto por defecto', () => {
    params$.next({ id: 'pro' });
    vi.mocked(plansService.getPlanByCode).mockReturnValueOnce(
      throwError(() => ({ name: 'x' } as Error)),
    );
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.errorMessage).toBe('Error al cargar el plan');
  });

  it('loadPlanDefinitions con PascalCase y categorías normaliza catálogo', () => {
    vi.mocked(plansService.getPlanDefinitions).mockReturnValueOnce(
      of({
        data: {
          Features: [
            { Key: 'm0', Name: 'M0', Category: 'module' },
            { Key: 'm1', Name: 'M1', Category: 'modules' },
            { Key: 'n1', Name: 'N1', Category: 'network' },
            { Key: 'n2', Name: 'N2', Category: 'networks' },
            { Key: 'o1', Name: 'O1', Category: 'Custom' },
          ],
          Limits: [{ Key: 'Lx', Name: 'Lx', Category: 'cat', DependsOnFeatures: [] }],
        },
      } as any),
    );
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.featuresCatalog[0]?.Category).toBe('module');
    expect(c.featuresCatalog[1]?.Category).toBe('module');
    expect(c.featuresCatalog[2]?.Category).toBe('network');
    expect(c.featuresCatalog[3]?.Category).toBe('network');
    expect(c.featuresCatalog[4]?.Category).toBe('custom');
    expect(c.limitsCatalog.length).toBe(1);
  });

  it('loadPlanDefinitions ante error registra en consola', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(plansService.getPlanDefinitions).mockReturnValueOnce(
      throwError(() => new Error('defs')),
    );
    TestBed.createComponent(PlanFormComponent).detectChanges();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('validateCurrentStep rechaza precio negativo en plan de pago', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.currentStep = 1;
    c.formData = {
      Code: 'p',
      Name: 'P',
      Description: '',
      IsDefault: false,
      IsPaid: true,
      IsActive: true,
      Price: -1,
    };
    expect(c.validateCurrentStep()).toBe(false);
    expect(c.errorMessage).toContain('precio');
  });

  it('goToStep ignora pasos fuera de rango', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.formData = { Code: 'c', Name: 'n', Description: '', IsDefault: false, IsPaid: false, IsActive: true, Price: null };
    c.currentStep = 2;
    c.goToStep(0);
    c.goToStep(99);
    expect(c.currentStep).toBe(2);
  });

  it('goToStep no salta hacia adelante sin validar paso intermedio', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.formData = { Code: 'c', Name: 'n', Description: '', IsDefault: false, IsPaid: false, IsActive: true, Price: null };
    c.currentStep = 1;
    c.goToStep(3);
    expect(c.currentStep).toBe(1);
  });

  it('getFeatureHint vacío cuando no hay límites relacionados', () => {
    const fixture = TestBed.createComponent(PlanFormComponent);
    const c = fixture.componentInstance;
    c.limitsCatalog = [];
    expect(c.getFeatureHint('x')).toBe('');
    expect(c.getFeatureHintLines('x')).toEqual([]);
  });

  it('savePlan en edición sin planId usa createPlan', () => {
    vi.mocked(plansService.createPlan).mockClear();
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.isEditMode = true;
    c.planId = null;
    c.formData = {
      Code: 'new',
      Name: 'N',
      Description: '',
      IsDefault: false,
      IsPaid: false,
      IsActive: true,
      Price: null,
    };
    c.currentStep = 1;
    c.savePlan();
    expect(plansService.createPlan).toHaveBeenCalled();
  });
});
