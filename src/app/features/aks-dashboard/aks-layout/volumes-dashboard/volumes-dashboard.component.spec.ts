import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolumesDashboardComponent } from './volumes-dashboard.component';

describe('VolumesDashboardComponent', () => {
  let component: VolumesDashboardComponent;
  let fixture: ComponentFixture<VolumesDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolumesDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VolumesDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
