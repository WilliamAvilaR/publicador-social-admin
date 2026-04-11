import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { PlansListComponent } from './plans-list.component';
import { PlansService } from '../../services/plans.service';
import { Plan, PublicPlan } from '../../models/plan.model';

describe('PlansListComponent', () => {
  const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

  const plansService = {
    getPlans: vi.fn(),
    getPublicPlans: vi.fn(),
  };

  const defaultAdminResponse = {
    data: {
      Plans: [
        {
          PlanId: 1,
          Code: 'p',
          Name: 'Plan',
          Description: '',
          IsDefault: false,
          IsPaid: false,
          IsActive: true,
          Price: null,
        },
      ],
    },
  };

  const defaultPublicResponse = {
    data: {
      plans: [
        {
          code: 'free',
          name: 'Free',
          description: '',
          isDefault: true,
          isPaid: false,
          price: null,
        },
      ],
    },
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    queryParamMap$.next(convertToParamMap({}));
    plansService.getPlans.mockReturnValue(of(defaultAdminResponse as any));
    plansService.getPublicPlans.mockReturnValue(of(defaultPublicResponse as any));

    TestBed.configureTestingModule({
      imports: [PlansListComponent],
      providers: [
        { provide: PlansService, useValue: plansService },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: queryParamMap$.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('en subtab admin carga planes de administración', () => {
    const fixture = TestBed.createComponent(PlansListComponent);
    fixture.detectChanges();
    expect(plansService.getPlans).toHaveBeenCalled();
    expect(fixture.componentInstance.activeSubTab).toBe('admin');
  });

  it('cualquier subtab distinta de public se trata como admin', () => {
    queryParamMap$.next(convertToParamMap({ subtab: 'otro' }));
    const fixture = TestBed.createComponent(PlansListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.activeSubTab).toBe('admin');
    expect(plansService.getPlans).toHaveBeenCalled();
  });

  it('en subtab public carga catálogo público', () => {
    queryParamMap$.next(convertToParamMap({ subtab: 'public' }));
    const fixture = TestBed.createComponent(PlansListComponent);
    fixture.detectChanges();
    expect(plansService.getPublicPlans).toHaveBeenCalled();
    expect(fixture.componentInstance.activeSubTab).toBe('public');
  });

  it('al cambiar query de admin a public dispara loadPublicPlans', () => {
    const fixture = TestBed.createComponent(PlansListComponent);
    fixture.detectChanges();
    plansService.getPublicPlans.mockClear();
    queryParamMap$.next(convertToParamMap({ subtab: 'public' }));
    fixture.detectChanges();
    expect(plansService.getPublicPlans).toHaveBeenCalled();
    expect(fixture.componentInstance.activeSubTab).toBe('public');
  });

  it('loadAdminPlans mapea planes en camelCase y maneja error', () => {
    plansService.getPlans.mockReturnValue(
      of({
        data: {
          plans: [
            {
              planId: 2,
              code: 'pro',
              name: 'Pro',
              description: 'd',
              isDefault: true,
              isPaid: true,
              isActive: true,
              price: 9.99,
            },
          ],
        },
      } as any),
    );
    const fixture = TestBed.createComponent(PlansListComponent);
    fixture.detectChanges();
    const p = fixture.componentInstance.plans[0];
    expect(p.Code).toBe('pro');
    expect(p.IsDefault).toBe(true);
    expect(p.Price).toBe(9.99);
    expect(fixture.componentInstance.isLoadingAdmin).toBe(false);

    plansService.getPlans.mockReturnValue(throwError(() => new Error('red')));
    queryParamMap$.next(convertToParamMap({}));
    const f2 = TestBed.createComponent(PlansListComponent);
    f2.detectChanges();
    expect(f2.componentInstance.errorMessage).toContain('red');
    expect(f2.componentInstance.isLoadingAdmin).toBe(false);
  });

  it('loadPublicPlans usa Plans o plans, normaliza PascalCase y error vacía lista', () => {
    plansService.getPublicPlans.mockReturnValue(
      of({
        data: {
          Plans: [
            {
              Code: 'x',
              Name: 'X',
              Description: 'Desc',
              Price: 10,
              Currency: 'USD',
              BillingPeriod: 'year',
              DisplayOrder: 1,
              Limits: { pages: 5 },
              Features: ['A'],
            },
          ],
        },
      } as any),
    );
    queryParamMap$.next(convertToParamMap({ subtab: 'public' }));
    const fixture = TestBed.createComponent(PlansListComponent);
    fixture.detectChanges();
    const pub = fixture.componentInstance.publicPlans[0];
    expect(pub.code).toBe('x');
    expect(pub.currency).toBe('USD');
    expect(pub.billingPeriod).toBe('year');
    expect(pub.limits?.pages).toBe(5);

    plansService.getPublicPlans.mockReturnValue(throwError(() => new Error('catálogo KO')));
    queryParamMap$.next(convertToParamMap({ subtab: 'public' }));
    const f2 = TestBed.createComponent(PlansListComponent);
    f2.detectChanges();
    expect(f2.componentInstance.publicErrorMessage).toContain('catálogo KO');
    expect(f2.componentInstance.publicPlans).toEqual([]);
    expect(f2.componentInstance.isLoadingPublic).toBe(false);
  });

  it('getPlanStatusClass y getPlanStatusText cubren activo, por defecto e inactivo', () => {
    const fixture = TestBed.createComponent(PlansListComponent);
    const c = fixture.componentInstance;
    const base = {
      PlanId: 1,
      Code: 'a',
      Name: 'A',
      Description: '',
      IsPaid: false,
      Price: null,
    } as Plan;

    expect(c.getPlanStatusClass({ ...base, IsActive: false, IsDefault: false })).toBe('status-inactive');
    expect(c.getPlanStatusText({ ...base, IsActive: false, IsDefault: false })).toBe('Inactivo');

    expect(c.getPlanStatusClass({ ...base, IsActive: true, IsDefault: true })).toBe('status-default');
    expect(c.getPlanStatusText({ ...base, IsActive: true, IsDefault: true })).toBe('Por Defecto');

    expect(c.getPlanStatusClass({ ...base, IsActive: true, IsDefault: false })).toBe('status-active');
    expect(c.getPlanStatusText({ ...base, IsActive: true, IsDefault: false })).toBe('Activo');
  });

  it('formatPrice y getPublicCardAmount / periodo / límites', () => {
    const fixture = TestBed.createComponent(PlansListComponent);
    const c = fixture.componentInstance;

    expect(c.formatPrice(null)).toBe('Gratis');
    expect(c.formatPrice(10)).toBe('$10.00');

    const p = (partial: Partial<PublicPlan>): PublicPlan =>
      ({
        code: '',
        name: '',
        description: '',
        isDefault: false,
        isPaid: false,
        price: null,
        ...partial,
      }) as PublicPlan;

    expect(c.getPublicCardAmount(p({ price: null }))).toBe('Gratis');
    expect(c.getPublicCardAmount(p({ price: undefined }))).toBe('Gratis');
    expect(c.getPublicCardAmount(p({ price: 0 }))).toBe('Gratis');
    expect(c.getPublicCardAmount(p({ price: 12 }))).toBe('12');
    expect(c.getPublicCardAmount(p({ price: 12.5 }))).toBe('12.50');

    expect(c.showPublicPricePeriod(p({ price: null }))).toBe(false);
    expect(c.showPublicPricePeriod(p({ price: 10 }))).toBe(true);

    expect(c.getPublicPricePeriodLabel(p({ billingPeriod: 'year' } as PublicPlan))).toBe('/año');
    expect(c.getPublicPricePeriodLabel(p({ billingPeriod: 'month' } as PublicPlan))).toBe('/mes');

    expect(c.getPublicLimitForCard(p({ limits: undefined }), 'pages')).toBe('N/A');
    expect(c.getPublicLimitForCard(p({ limits: { pages: 2 } }), 'users')).toBe('N/A');
    expect(c.getPublicLimitForCard(p({ limits: { pages: 3 } }), 'pages')).toBe('3');

    expect(c.formatPublicLimit(null)).toBe('Ilimitado');
    expect(c.formatPublicLimit(undefined)).toBe('Ilimitado');
    expect(c.formatPublicLimit(-1)).toBe('Ilimitado');
    expect(c.formatPublicLimit(1500)).toMatch(/1[,.]?500/);
    expect(c.formatPublicLimit(42)).toBe('42');
  });

  it('getters totalPlans, activePlans, paidPlans y defaultPlan', () => {
    const fixture = TestBed.createComponent(PlansListComponent);
    const c = fixture.componentInstance;
    c.plans = [
      {
        PlanId: 1,
        Code: 'd',
        Name: 'D',
        Description: '',
        IsDefault: true,
        IsPaid: false,
        IsActive: true,
        Price: null,
      },
      {
        PlanId: 2,
        Code: 'p',
        Name: 'P',
        Description: '',
        IsDefault: false,
        IsPaid: true,
        IsActive: false,
        Price: 1,
      },
    ];
    expect(c.totalPlans).toBe(2);
    expect(c.activePlans).toBe(1);
    expect(c.paidPlans).toBe(1);
    expect(c.defaultPlan?.Code).toBe('d');
  });

  it('publicPlansOrdered ordena por displayOrder y nombre', () => {
    const fixture = TestBed.createComponent(PlansListComponent);
    const c = fixture.componentInstance;
    c.publicPlans = [
      { code: 'b', name: 'Beta', displayOrder: 1 } as PublicPlan,
      { code: 'a', name: 'Alfa', displayOrder: 1 } as PublicPlan,
      { code: 'z', name: 'Zeta', displayOrder: 0 } as PublicPlan,
    ];
    const names = c.publicPlansOrdered.map((x) => x.name);
    expect(names[0]).toBe('Zeta');
    expect(names[1]).toBe('Alfa');
    expect(names[2]).toBe('Beta');
  });

  it('uniquePublicFeatureLabels y planIncludesFeature', () => {
    const fixture = TestBed.createComponent(PlansListComponent);
    const c = fixture.componentInstance;
    c.publicPlans = [
      {
        code: 'a',
        name: 'A',
        features: ['  Beta ', 'Beta', '', 'Alfa'],
      } as PublicPlan,
    ];
    expect(c.uniquePublicFeatureLabels).toEqual(['Alfa', 'Beta']);

    const plan = c.publicPlans[0];
    expect(c.planIncludesFeature(plan, 'Alfa')).toBe(true);
    expect(c.planIncludesFeature(plan, 'Gamma')).toBe(false);
  });

  it('getPublicCardHighlights prioriza features y cae en límites si no hay', () => {
    const fixture = TestBed.createComponent(PlansListComponent);
    const c = fixture.componentInstance;

    const withFeatures: PublicPlan = {
      code: 'f',
      name: 'F',
      description: '',
      isDefault: false,
      isPaid: false,
      price: null,
      features: ['uno', 'dos', 'tres', 'cuatro'],
    } as PublicPlan;
    expect(c.getPublicCardHighlights(withFeatures, 3)).toEqual(['uno', 'dos', 'tres']);

    const withLimits: PublicPlan = {
      code: 'l',
      name: 'L',
      description: '',
      isDefault: false,
      isPaid: false,
      price: null,
      features: [],
      limits: { pages: 10, users: 2 },
    } as PublicPlan;
    const h = c.getPublicCardHighlights(withLimits, 3);
    expect(h.some((line) => line.includes('Páginas'))).toBe(true);
  });
});
