import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdsServiceComponent } from './rds-service.component';

describe('RdsServiceComponent', () => {
  let component: RdsServiceComponent;
  let fixture: ComponentFixture<RdsServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdsServiceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdsServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
