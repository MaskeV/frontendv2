import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleUpdationComponent } from './role-updation.component';

describe('RoleUpdationComponent', () => {
  let component: RoleUpdationComponent;
  let fixture: ComponentFixture<RoleUpdationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleUpdationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleUpdationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
