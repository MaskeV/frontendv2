import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AksOverviewComponent } from './aks-overview.component';

describe('AksOverviewComponent', () => {
  let component: AksOverviewComponent;
  let fixture: ComponentFixture<AksOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AksOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AksOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
