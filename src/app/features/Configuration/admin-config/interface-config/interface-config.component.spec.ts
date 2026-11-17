import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterfaceConfigComponent } from './interface-config.component';

describe('InterfaceConfigComponent', () => {
  let component: InterfaceConfigComponent;
  let fixture: ComponentFixture<InterfaceConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterfaceConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterfaceConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
