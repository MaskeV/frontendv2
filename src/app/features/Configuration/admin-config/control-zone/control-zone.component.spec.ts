import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlZoneComponent } from './control-zone.component';

describe('ControlZoneComponent', () => {
  let component: ControlZoneComponent;
  let fixture: ComponentFixture<ControlZoneComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlZoneComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlZoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
