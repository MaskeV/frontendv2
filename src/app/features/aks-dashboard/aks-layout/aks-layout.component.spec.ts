import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AksLayoutComponent } from './aks-layout.component';

describe('AksLayoutComponent', () => {
  let component: AksLayoutComponent;
  let fixture: ComponentFixture<AksLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AksLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AksLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
