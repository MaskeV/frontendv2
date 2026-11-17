import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlZoneManagementComponent } from './control-zone-managment.component';

describe('ControlZoneManagmentComponent', () => {
  let component: ControlZoneManagementComponent;
  let fixture: ComponentFixture<ControlZoneManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlZoneManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlZoneManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
